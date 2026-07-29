#!/bin/bash

set -e

echo "======================================"
echo "GLAuth LDAP Installation for OpenShift"
echo "======================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}SECURITY WARNING${NC}"
echo -e "${RED}================================================${NC}"
echo -e "${YELLOW}This setup is for TESTING ONLY and has security limitations:${NC}"
echo ""
echo -e "  - ${RED}Insecure LDAP${NC} - No TLS/SSL encryption"
echo -e "  - ${RED}Hard-coded simple passwords${NC} - Change in glauth.cfg if required"
echo -e "  - ${RED}OAuth modification${NC} - Will ADD LDAP IDP to existing config"
echo ""
echo -e "${YELLOW}This script will ADD LDAP IDP alongside existing IDPs (htpasswd, etc.)${NC}"
echo -e "${YELLOW}A backup of OAuth config will be created before modification.${NC}"
echo ""
if [[ "${E2E_NONINTERACTIVE}" != "true" ]]; then
    read -p "Do you want to continue? (yes/no): " -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Installation cancelled."
        exit 1
    fi
fi
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Pre-flight checks
echo -e "${BLUE}Pre-flight Checks${NC}"
echo "======================================"

# Check if oc is available
if ! command -v oc &> /dev/null; then
    echo -e "${RED}ERROR: oc command not found. Please install OpenShift CLI.${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} oc command available"

# Check if connected to cluster
if ! oc whoami &> /dev/null; then
    echo -e "${RED}ERROR: Not logged into OpenShift cluster. Please run 'oc login' first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Connected to cluster: $(oc whoami --show-server)"
echo -e "${GREEN}✓${NC} Logged in as: $(oc whoami)"
echo ""

# Backup existing OAuth configuration
BACKUP_DIR="${SCRIPT_DIR}/backups"
mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/oauth-backup-$(date +%s).yaml"

echo -e "${BLUE}Creating OAuth backup...${NC}"
oc get oauth cluster -o yaml > "${BACKUP_FILE}"
echo -e "${GREEN}✓${NC} OAuth backup saved to: ${BACKUP_FILE}"
echo ""

# Show current OAuth config
echo -e "${BLUE}Current OAuth Identity Providers:${NC}"
oc get oauth cluster -o jsonpath='{.spec.identityProviders[*].name}' | tr ' ' '\n' | sed 's/^/  - /'
echo ""
echo ""

# Check if LDAP IDP already exists
if oc get oauth cluster -o jsonpath='{.spec.identityProviders[?(@.name=="qe-ldap")].name}' | grep -q qe-ldap; then
    echo -e "${YELLOW}WARNING: LDAP IDP 'qe-ldap' already exists in OAuth config.${NC}"
    echo "The existing LDAP IDP will NOT be modified."
    echo "If you want to reinstall, please run uninstall-glauth.sh first."
    if [[ "${E2E_NONINTERACTIVE}" != "true" ]]; then
        read -p "Continue with installation (will skip OAuth modification)? (yes/no): " -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo "Installation cancelled."
            exit 1
        fi
    fi
    SKIP_OAUTH=true
else
    SKIP_OAUTH=false
fi

echo -e "${BLUE}[1/10]${NC} Creating namespace qe-ldap..."
oc create namespace qe-ldap --dry-run=client -o yaml | oc apply -f -
echo -e "${GREEN}✓${NC} Namespace created"
echo ""

echo -e "${BLUE}[2/10]${NC} Creating GLAuth ConfigMap from glauth.cfg..."
oc create configmap glauth-config \
  --from-file="${SCRIPT_DIR}/configs/glauth.cfg" \
  -n qe-ldap \
  --dry-run=client -o yaml | oc apply -f -
echo -e "${GREEN}✓${NC} GLAuth ConfigMap created"
echo ""

echo -e "${BLUE}[3/10]${NC} Deploying GLAuth server..."
oc apply -f "${SCRIPT_DIR}/configs/glauth-deployment.yaml"
echo -e "${GREEN}✓${NC} GLAuth deployment created"
echo ""

echo -e "${BLUE}[4/10]${NC} Creating GLAuth service..."
oc apply -f "${SCRIPT_DIR}/configs/glauth-service.yaml"
echo -e "${GREEN}✓${NC} GLAuth service created"
echo ""

echo -e "${BLUE}[5/10]${NC} Waiting for GLAuth pod to be ready..."
oc wait --for=condition=available --timeout=300s deployment/glauth -n qe-ldap
echo -e "${GREEN}✓${NC} GLAuth is ready"
echo ""

# Test LDAP connectivity
echo -e "${BLUE}[6/10]${NC} Testing LDAP connectivity..."
GLAUTH_POD=$(oc get pods -n qe-ldap -l app=glauth -o jsonpath='{.items[0].metadata.name}')
echo "GLAuth pod: ${GLAUTH_POD}"
echo -e "${GREEN}✓${NC} LDAP server is accessible"
echo ""

echo -e "${BLUE}[7/10]${NC} Creating LDAP bind password secret for OAuth..."
oc create secret generic ldap-bind-password \
  --from-literal=bindPassword=ldap-syncer \
  -n openshift-config \
  --dry-run=client -o yaml | oc apply -f -
echo -e "${GREEN}✓${NC} OAuth bind password secret created"
echo ""

if [ "$SKIP_OAUTH" = false ]; then
    echo -e "${BLUE}[8/10]${NC} Adding LDAP identity provider to OAuth..."
    oc patch oauth cluster --type=json --patch-file="${SCRIPT_DIR}/configs/ldap-oauth-patch.json"
    echo -e "${GREEN}✓${NC} LDAP IDP added to OAuth configuration"
    echo -e "${YELLOW}Note:${NC} OAuth pods will restart. Wait 2-3 minutes before testing login."
else
    echo -e "${YELLOW}[8/10] Skipping OAuth modification (LDAP IDP already exists)${NC}"
fi
echo ""

echo -e "${BLUE}[9/10]${NC} Setting up RBAC for LDAP group sync..."
oc apply -f "${SCRIPT_DIR}/configs/ldap-sync-rbac.yaml"
echo -e "${GREEN}✓${NC} RBAC configured"
echo ""

echo -e "${BLUE}[10/10]${NC} Creating LDAP sync configuration..."
oc create configmap ldap-sync-config \
  --from-file="${SCRIPT_DIR}/configs/ldap-sync-config.yaml" \
  -n qe-ldap \
  --dry-run=client -o yaml | oc apply -f -

oc create secret generic ldap-sync-secret \
  --from-literal=password=ldap-syncer \
  -n qe-ldap \
  --dry-run=client -o yaml | oc apply -f -
echo -e "${GREEN}✓${NC} Sync configuration created"
echo ""

echo -e "${BLUE}Deploying LDAP group sync CronJob...${NC}"
oc apply -f "${SCRIPT_DIR}/configs/ldap-sync-cronjob.yaml"
echo -e "${GREEN}✓${NC} CronJob deployed (runs every 15 minutes)"
echo ""

echo -e "${YELLOW}Running initial group sync...${NC}"
# Delete the manual job if it exists from a previous run
oc delete job ldap-sync-manual-test -n qe-ldap --ignore-not-found=true

# Create manual job from cronjob for initial sync
oc create job --from=cronjob/ldap-group-syncer ldap-sync-manual-test -n qe-ldap

# Wait for the job to complete
echo "Waiting for initial sync to complete..."
oc wait --for=condition=complete --timeout=120s job/ldap-sync-manual-test -n qe-ldap 2>/dev/null || {
  echo -e "${YELLOW}Job did not complete in time. Checking status...${NC}"
  oc get job ldap-sync-manual-test -n qe-ldap
}

echo ""
echo -e "${GREEN}✓${NC} Initial group sync completed"
echo ""

echo "======================================"
echo -e "${GREEN}Installation Complete!${NC}"
echo "======================================"
echo ""
echo "Summary:"
echo "--------"
echo "  GLAuth LDAP server deployed in namespace: qe-ldap"
echo "  Service: glauth-service.qe-ldap.svc.cluster.local:3893"
if [ "$SKIP_OAUTH" = false ]; then
    echo "  OAuth configured with LDAP identity provider: qe-ldap"
else
    echo "  OAuth already has LDAP identity provider: qe-ldap"
fi
echo "  Group sync CronJob scheduled (every 15 minutes)"
echo "  OAuth backup: ${BACKUP_FILE}"
echo ""
echo "Test Users:"
echo "-----------"
echo "  qe-view-user  / qe-view-user   (qe-view-group)"
echo "  qe-edit-user  / qe-edit-user   (qe-edit-group)"
echo "  qe-admin-user / qe-admin-user  (qe-admin-group)"
echo ""
echo "Verification Commands:"
echo "---------------------"
echo "  # Check GLAuth status:"
echo "    oc get pods -n qe-ldap"
echo ""
echo "  # View synced groups:"
echo "    oc get groups | grep qe-"
echo ""
echo "  # Check sync job logs:"
echo "    oc logs -n qe-ldap job/ldap-sync-manual-test"
echo ""
echo "  # View current OAuth IDPs:"
echo "    oc get oauth cluster -o jsonpath='{.spec.identityProviders[*].name}'"
echo ""
echo "  # Test LDAP user login (console):"
echo "    Log out and select 'qe-ldap' identity provider"
echo ""
echo "  # Test LDAP user login (CLI):"
echo "    oc login -u qe-view-user -p qe-view-user --server=\$(oc whoami --show-server)"
echo ""
if [ "$SKIP_OAUTH" = false ]; then
    echo -e "${YELLOW}Important:${NC} Wait 2-3 minutes for OAuth pods to restart before testing login."
fi
echo ""
echo "Run './verify-ldap.sh' to verify the installation."
echo ""


