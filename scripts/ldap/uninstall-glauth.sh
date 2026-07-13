#!/bin/bash

set -e

echo "======================================"
echo "GLAuth LDAP Uninstallation"
echo "======================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This will remove:${NC}"
echo "  - LDAP identity provider from OAuth"
echo "  - GLAuth deployment and all resources"
echo "  - LDAP group sync CronJob"
echo "  - Synced LDAP groups"
echo "  - All secrets and ConfigMaps"
echo ""
echo -e "${RED}WARNING: This operation cannot be undone!${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Uninstallation cancelled."
    exit 0
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

# Backup existing OAuth configuration before removal
BACKUP_DIR="${SCRIPT_DIR}/backups"
mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/oauth-before-removal-$(date +%s).yaml"

echo -e "${BLUE}Creating OAuth backup before removal...${NC}"
oc get oauth cluster -o yaml > "${BACKUP_FILE}"
echo -e "${GREEN}✓${NC} OAuth backup saved to: ${BACKUP_FILE}"
echo ""

# Check if LDAP IDP exists
LDAP_IDP_EXISTS=false
if oc get oauth cluster -o jsonpath='{.spec.identityProviders[?(@.name=="qe-ldap")].name}' | grep -q qe-ldap; then
    LDAP_IDP_EXISTS=true
    echo -e "${BLUE}[1/7]${NC} Removing LDAP identity provider from OAuth..."
    
    # Find the index of qe-ldap IDP
    LDAP_INDEX=$(oc get oauth cluster -o json | jq '.spec.identityProviders | map(.name == "qe-ldap") | index(true)')
    
    if [ "$LDAP_INDEX" != "null" ]; then
        oc patch oauth cluster --type=json -p="[{\"op\": \"remove\", \"path\": \"/spec/identityProviders/${LDAP_INDEX}\"}]"
        echo -e "${GREEN}✓${NC} LDAP IDP removed from OAuth"
        echo -e "${YELLOW}Note:${NC} OAuth pods will restart."
    else
        echo -e "${YELLOW}Could not find LDAP IDP index, skipping OAuth modification${NC}"
    fi
else
    echo -e "${YELLOW}[1/7] LDAP IDP not found in OAuth, skipping removal${NC}"
fi
echo ""

echo -e "${BLUE}[2/7]${NC} Deleting OAuth bind password secret..."
oc delete secret ldap-bind-password -n openshift-config --ignore-not-found=true
echo -e "${GREEN}✓${NC} Secret deleted"
echo ""

echo -e "${BLUE}[3/7]${NC} Deleting synced LDAP groups..."
oc delete group qe-view-group qe-edit-group qe-admin-group --ignore-not-found=true
echo -e "${GREEN}✓${NC} Groups deleted"
echo ""

echo -e "${BLUE}[4/7]${NC} Deleting LDAP sync CronJob..."
oc delete cronjob ldap-group-syncer -n qe-ldap --ignore-not-found=true
echo -e "${GREEN}✓${NC} CronJob deleted"
echo ""

echo -e "${BLUE}[5/7]${NC} Deleting LDAP sync RBAC..."
oc delete clusterrolebinding ldap-group-syncer-binding --ignore-not-found=true
oc delete clusterrole ldap-group-sync-role --ignore-not-found=true
oc delete serviceaccount ldap-group-syncer -n qe-ldap --ignore-not-found=true
echo -e "${GREEN}✓${NC} RBAC deleted"
echo ""

echo -e "${BLUE}[6/7]${NC} Deleting sync configuration..."
oc delete configmap ldap-sync-config -n qe-ldap --ignore-not-found=true
oc delete secret ldap-sync-secret -n qe-ldap --ignore-not-found=true
echo -e "${GREEN}✓${NC} Sync configuration deleted"
echo ""

echo -e "${BLUE}[7/7]${NC} Deleting qe-ldap namespace (includes GLAuth)..."
oc delete namespace qe-ldap --ignore-not-found=true
echo -e "${GREEN}✓${NC} Namespace deleted (this may take a moment)"
echo ""

echo "======================================"
echo -e "${GREEN}Uninstallation Complete!${NC}"
echo "======================================"
echo ""
echo "Summary:"
echo "--------"
if [ "$LDAP_IDP_EXISTS" = true ]; then
    echo "  LDAP IDP removed from OAuth"
fi
echo "  qe-ldap namespace deleted"
echo "  All LDAP resources removed"
echo "  OAuth backup: ${BACKUP_FILE}"
echo ""
echo "Verification Commands:"
echo "---------------------"
echo "  # Check remaining OAuth IDPs:"
echo "    oc get oauth cluster -o jsonpath='{.spec.identityProviders[*].name}'"
echo ""
echo "  # Verify namespace is gone:"
echo "    oc get namespace qe-ldap"
echo ""
echo "  # Check for remaining LDAP groups:"
echo "    oc get groups | grep qe-"
echo ""
if [ "$LDAP_IDP_EXISTS" = true ]; then
    echo -e "${YELLOW}Note:${NC} If you want to restore the previous OAuth config, run:"
    echo "  oc apply -f ${BACKUP_FILE}"
fi
echo ""


