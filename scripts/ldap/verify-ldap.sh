#!/bin/bash

echo "======================================"
echo "GLAuth LDAP Installation Verification"
echo "======================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper functions
print_check() {
    local status=$1
    local message=$2
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✓${NC} ${message}"
    elif [ "$status" = "fail" ]; then
        echo -e "${RED}✗${NC} ${message}"
        ((ERRORS++))
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}⚠${NC} ${message}"
        ((WARNINGS++))
    else
        echo -e "${BLUE}ℹ${NC} ${message}"
    fi
}

# Pre-flight checks
echo -e "${BLUE}Pre-flight Checks${NC}"
echo "======================================"

if ! command -v oc &> /dev/null; then
    print_check "fail" "oc command not found"
    exit 1
fi
print_check "pass" "oc command available"

if ! oc whoami &> /dev/null; then
    print_check "fail" "Not logged into OpenShift cluster"
    exit 1
fi
print_check "pass" "Connected to cluster: $(oc whoami --show-server)"
print_check "info" "Logged in as: $(oc whoami)"
echo ""

# Check namespace
echo -e "${BLUE}[1/9] Namespace Check${NC}"
echo "======================================"
if oc get namespace qe-ldap &> /dev/null; then
    print_check "pass" "qe-ldap namespace exists"
else
    print_check "fail" "qe-ldap namespace not found"
fi
echo ""

# Check GLAuth deployment
echo -e "${BLUE}[2/9] GLAuth Deployment${NC}"
echo "======================================"
if oc get deployment glauth -n qe-ldap &> /dev/null; then
    print_check "pass" "GLAuth deployment exists"
    
    READY=$(oc get deployment glauth -n qe-ldap -o jsonpath='{.status.readyReplicas}')
    DESIRED=$(oc get deployment glauth -n qe-ldap -o jsonpath='{.spec.replicas}')
    
    if [ "$READY" = "$DESIRED" ] && [ "$READY" != "" ]; then
        print_check "pass" "GLAuth deployment ready (${READY}/${DESIRED})"
    else
        print_check "fail" "GLAuth deployment not ready (${READY}/${DESIRED})"
    fi
else
    print_check "fail" "GLAuth deployment not found"
fi
echo ""

# Check GLAuth pod
echo -e "${BLUE}[3/9] GLAuth Pod${NC}"
echo "======================================"
POD_STATUS=$(oc get pods -n qe-ldap -l app=glauth -o jsonpath='{.items[0].status.phase}' 2>/dev/null)
if [ "$POD_STATUS" = "Running" ]; then
    POD_NAME=$(oc get pods -n qe-ldap -l app=glauth -o jsonpath='{.items[0].metadata.name}')
    print_check "pass" "GLAuth pod running: ${POD_NAME}"
    
    # Check pod restarts
    RESTARTS=$(oc get pods -n qe-ldap -l app=glauth -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}')
    if [ "$RESTARTS" -eq 0 ]; then
        print_check "pass" "No pod restarts"
    elif [ "$RESTARTS" -lt 3 ]; then
        print_check "warn" "Pod has restarted ${RESTARTS} times"
    else
        print_check "fail" "Pod has restarted ${RESTARTS} times (too many)"
    fi
else
    print_check "fail" "GLAuth pod not running (status: ${POD_STATUS})"
fi
echo ""

# Check GLAuth service
echo -e "${BLUE}[4/9] GLAuth Service${NC}"
echo "======================================"
if oc get service glauth-service -n qe-ldap &> /dev/null; then
    print_check "pass" "GLAuth service exists"
    
    SERVICE_IP=$(oc get service glauth-service -n qe-ldap -o jsonpath='{.spec.clusterIP}')
    SERVICE_PORT=$(oc get service glauth-service -n qe-ldap -o jsonpath='{.spec.ports[0].port}')
    print_check "info" "Service endpoint: ${SERVICE_IP}:${SERVICE_PORT}"
else
    print_check "fail" "GLAuth service not found"
fi
echo ""

# Check OAuth configuration
echo -e "${BLUE}[5/9] OAuth Configuration${NC}"
echo "======================================"
if oc get oauth cluster -o jsonpath='{.spec.identityProviders[?(@.name=="qe-ldap")].name}' | grep -q qe-ldap; then
    print_check "pass" "LDAP IDP 'qe-ldap' configured in OAuth"
    
    # Check LDAP URL
    LDAP_URL=$(oc get oauth cluster -o jsonpath='{.spec.identityProviders[?(@.name=="qe-ldap")].ldap.url}')
    if [ "$LDAP_URL" = "ldap://glauth-service.qe-ldap.svc.cluster.local:3893/ou=users,dc=qe-ldap,dc=internal?cn?sub" ]; then
        print_check "pass" "LDAP URL correctly configured"
    else
        print_check "warn" "LDAP URL: ${LDAP_URL}"
    fi
    
    # Check bind DN
    BIND_DN=$(oc get oauth cluster -o jsonpath='{.spec.identityProviders[?(@.name=="qe-ldap")].ldap.bindDN}')
    if [ "$BIND_DN" = "cn=ldap-syncer,ou=sync-group,ou=users,dc=qe-ldap,dc=internal" ]; then
        print_check "pass" "Bind DN correctly configured"
    else
        print_check "warn" "Bind DN: ${BIND_DN}"
    fi
else
    print_check "fail" "LDAP IDP not found in OAuth configuration"
fi

# List all IDPs
print_check "info" "OAuth Identity Providers:"
oc get oauth cluster -o jsonpath='{.spec.identityProviders[*].name}' | tr ' ' '\n' | while read idp; do
    echo "      - ${idp}"
done
echo ""

# Check OAuth bind password secret
echo -e "${BLUE}[6/9] OAuth Secrets${NC}"
echo "======================================"
if oc get secret ldap-bind-password -n openshift-config &> /dev/null; then
    print_check "pass" "LDAP bind password secret exists"
else
    print_check "fail" "LDAP bind password secret not found"
fi
echo ""

# Check LDAP sync RBAC
echo -e "${BLUE}[7/9] LDAP Sync RBAC${NC}"
echo "======================================"
if oc get serviceaccount ldap-group-syncer -n qe-ldap &> /dev/null; then
    print_check "pass" "LDAP sync service account exists"
else
    print_check "fail" "LDAP sync service account not found"
fi

if oc get clusterrole ldap-group-sync-role &> /dev/null; then
    print_check "pass" "LDAP sync cluster role exists"
else
    print_check "fail" "LDAP sync cluster role not found"
fi

if oc get clusterrolebinding ldap-group-syncer-binding &> /dev/null; then
    print_check "pass" "LDAP sync cluster role binding exists"
else
    print_check "fail" "LDAP sync cluster role binding not found"
fi
echo ""

# Check LDAP sync CronJob
echo -e "${BLUE}[8/9] LDAP Group Sync${NC}"
echo "======================================"
if oc get cronjob ldap-group-syncer -n qe-ldap &> /dev/null; then
    print_check "pass" "LDAP sync CronJob exists"
    
    SCHEDULE=$(oc get cronjob ldap-group-syncer -n qe-ldap -o jsonpath='{.spec.schedule}')
    print_check "info" "Sync schedule: ${SCHEDULE}"
    
    LAST_SCHEDULE=$(oc get cronjob ldap-group-syncer -n qe-ldap -o jsonpath='{.status.lastScheduleTime}')
    if [ -n "$LAST_SCHEDULE" ]; then
        print_check "pass" "Last sync: ${LAST_SCHEDULE}"
    else
        print_check "warn" "No sync jobs have run yet"
    fi
else
    print_check "fail" "LDAP sync CronJob not found"
fi
echo ""

# Check synced groups
echo -e "${BLUE}[9/9] Synced LDAP Groups${NC}"
echo "======================================"
EXPECTED_GROUPS=("qe-view-group" "qe-edit-group" "qe-admin-group")
for group in "${EXPECTED_GROUPS[@]}"; do
    if oc get group "$group" &> /dev/null; then
        MEMBERS=$(oc get group "$group" -o jsonpath='{.users}' | tr -d '[]' | tr ',' ' ')
        if [ -n "$MEMBERS" ]; then
            print_check "pass" "Group ${group} exists with members: ${MEMBERS}"
        else
            print_check "warn" "Group ${group} exists but has no members"
        fi
    else
        print_check "fail" "Group ${group} not found"
    fi
done
echo ""

# OAuth pod status
echo -e "${BLUE}OAuth Pods Status${NC}"
echo "======================================"
OAUTH_PODS=$(oc get pods -n openshift-authentication -l app=oauth-openshift --no-headers 2>/dev/null | wc -l)
if [ "$OAUTH_PODS" -gt 0 ]; then
    print_check "pass" "Found ${OAUTH_PODS} OAuth pod(s)"
    oc get pods -n openshift-authentication -l app=oauth-openshift --no-headers | while read line; do
        POD_NAME=$(echo $line | awk '{print $1}')
        POD_STATUS=$(echo $line | awk '{print $3}')
        if [ "$POD_STATUS" = "Running" ]; then
            echo -e "      ${GREEN}✓${NC} ${POD_NAME}: ${POD_STATUS}"
        else
            echo -e "      ${YELLOW}⚠${NC} ${POD_NAME}: ${POD_STATUS}"
        fi
    done
else
    print_check "warn" "No OAuth pods found (they may be restarting)"
fi
echo ""

# Summary
echo "======================================"
echo -e "${BLUE}Verification Summary${NC}"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Wait 2-3 minutes for OAuth pods to fully restart"
    echo "  2. Test LDAP login via console (select 'qe-ldap' IDP)"
    echo "  3. Test with credentials: qe-view-user / qe-view-user"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}Verification completed with ${WARNINGS} warning(s)${NC}"
    echo ""
    echo "The installation appears functional but review warnings above."
    echo ""
    exit 0
else
    echo -e "${RED}Verification failed with ${ERRORS} error(s) and ${WARNINGS} warning(s)${NC}"
    echo ""
    echo "Please review the errors above and troubleshoot."
    echo ""
    echo "Troubleshooting commands:"
    echo "  # Check GLAuth logs:"
    echo "    oc logs -n qe-ldap deployment/glauth"
    echo ""
    echo "  # Check OAuth logs:"
    echo "    oc logs -n openshift-authentication -l app=oauth-openshift --tail=50"
    echo ""
    echo "  # Check sync job logs:"
    echo "    oc logs -n qe-ldap job/ldap-sync-manual-test"
    echo ""
    exit 1
fi


