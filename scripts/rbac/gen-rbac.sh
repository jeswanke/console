#!/usr/bin/env bash

# Copyright (c) 2022 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project

# Description:
#     Sets up htpasswd users and OAuth IDP for RBAC tests.
#
# Usage:
#     ./scripts/rbac/gen-rbac.sh
#
# Prerequisites:
#     - oc logged into the hub cluster (start.sh handles this)
#     - RBAC_TEST_PASSWORD set (or CYPRESS_CLC_RBAC_PASS for backward compat)
#
# Environment Variables:
#     RBAC_TEST_PASSWORD / CYPRESS_CLC_RBAC_PASS  - Password for all test users (required)
#     VIRT_TIER          - User tier: rbac-ui | vm | full | custom (default: rbac-ui)
#     RBAC_DIR           - Temp directory for htpasswd file (default: current dir)

set -e
set -x

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export RBAC_DIR=${RBAC_DIR:-/tmp}

# Support both env var names for backward compat during dual-pipeline period
RBAC_PASS="${RBAC_TEST_PASSWORD:-${CYPRESS_CLC_RBAC_PASS}}"
if [[ -z "${RBAC_PASS}" ]]; then
    echo "[ERROR] RBAC_TEST_PASSWORD (or CYPRESS_CLC_RBAC_PASS) is required."
    exit 1
fi

# Get hub API URL from current oc session (already logged in via start.sh)
HUB_API_URL="$(oc whoami --show-server 2>/dev/null)"
if [[ -z "${HUB_API_URL}" ]]; then
    echo "[ERROR] Not logged into a cluster. Run start.sh or oc login first."
    exit 1
fi

if ! command -v htpasswd &> /dev/null; then
  dnf install -y httpd-tools || yum install -y httpd-tools
fi

# ============================================================
# Base matrix users (always created)
# ============================================================
touch ${RBAC_DIR}/htpasswd
for access in cluster ns; do
  for role in cluster-admin admin edit view group clusterset-admin clusterset-view clusterset-bind; do
    htpasswd -b ${RBAC_DIR}/htpasswd clc-e2e-${role}-${access} ${RBAC_PASS}
  done
done

# ============================================================
# Virtualization RBAC Test Users
# Split by tier (VIRT_TIER) so only needed users are created.
# VIRT_TIER values: rbac-ui, vm, full, custom
# ============================================================

# --- Tier: rbac-ui (ACM-only RBAC wizard/role tests, no Fleet UI) ---
VIRT_USERS_RBAC_UI=(
    "clc-e2e-edit-test"            # kubevirt:edit for MCRA edit/delete, RHACM4K-60303
    "clc-e2e-hub-view"             # Hub view (subject content test), RHACM4K-60310
    "clc-e2e-edgecase-61736"       # Common projects edge case, RHACM4K-61736
    "clc-e2e-edgecase-61735"       # Empty cluster set edge case, RHACM4K-61735
    "clc-e2e-edgecase-61779"       # Roles page validation, RHACM4K-61779
    "clc-e2e-clusterset-61863"     # Cluster set entry RA creation, RHACM4K-61863
    "clc-e2e-edit-61823"           # Edit Role Assignment, RHACM4K-61823
    "clc-e2e-global-61726"         # Global Access RA, RHACM4K-61726
    "clc-e2e-csfull-61727"         # ClusterSet single full access, RHACM4K-61727
    "clc-e2e-csproj-61728"         # ClusterSet single project access, RHACM4K-61728
    "clc-e2e-csfull-61729"         # ClusterSet multiple full access, RHACM4K-61729
    "clc-e2e-csproj-61730"         # ClusterSet multiple project access, RHACM4K-61730
    "clc-e2e-clfull-61731"         # Cluster single full access, RHACM4K-61731
    "clc-e2e-clproj-61732"         # Cluster single project access, RHACM4K-61732
    "clc-e2e-clfull-61733"         # Cluster multiple full access, RHACM4K-61733
    "clc-e2e-clproj-61734"         # Cluster multiple project access, RHACM4K-61734
    "clc-e2e-reviewdiff-61825"     # Edit RA review diff, RHACM4K-61825
    "clc-e2e-rolespage-61856"      # Roles page entry RA, RHACM4K-61856
    "clc-e2e-clpage-61862"         # Clusters page entry RA, RHACM4K-61862
    "clc-e2e-dupra-61864"          # Duplicate RA edge case, RHACM4K-61864
    "clc-e2e-projmismatch-61865"   # Project mismatch edge case, RHACM4K-61865
    "clc-e2e-delete-61866"         # Delete Role Assignment, RHACM4K-61866
    "clc-e2e-cpadvanced-61867"     # Common projects advanced, RHACM4K-61867
    "clc-e2e-scopechange-61944"    # Edit RA scope change, RHACM4K-61944
    "clc-e2e-preauth-61797"        # Pre-authorized user creation, RHACM4K-61797
    "clc-e2e-del-60255"            # Disposable group delete test, RHACM4K-60255
)

# --- Tier: vm (Fleet UI tests, needs CNV -- added on top of rbac-ui) ---
VIRT_USERS_VM=(
    "clc-e2e-std-view"             # Standard kubevirt:view globally, RHACM4K-60309
    "clc-e2e-std-edit"             # Standard kubevirt:edit globally, RHACM4K-60309
    "clc-e2e-std-admin"            # Standard kubevirt:admin globally, RHACM4K-60309
    "clc-e2e-hub-view-only"        # Hub view only (no kubevirt:view), RHACM4K-60310
    "clc-e2e-hub-admin"            # Hub admin + kubevirt:view on spoke, RHACM4K-60311
    "clc-e2e-managed-view"         # Managed view infrastructure, RHACM4K-60467
    "clc-e2e-managed-admin"        # Managed admin infrastructure, RHACM4K-60468
    "clc-e2e-spoke-view-ns"        # kubevirt:view on spoke, RHACM4K-60302-60306
    "clc-e2e-group-last"           # Last assignment cleanup (group-based), RHACM4K-60307
    "clc-e2e-idp-kubevirt"         # IDP-agnostic kubevirtprojects, RHACM4K-60257
    "clc-e2e-idp-vm"               # IDP-agnostic VM permissions, RHACM4K-60258
    "clc-e2e-search-61846"         # Search cluster-proxy RBAC, RHACM4K-61846
    "clc-e2e-view-cluster-59195"   # MTV provider auto-creation, RHACM4K-59195
    "clc-e2e-operator"             # Spoke operator via group, RHACM4K-60239
)

# --- Tier: full (CCLM tests -- added on top of vm) ---
VIRT_USERS_CCLM=(
    "clc-e2e-cclm-view"            # CCLM view-only (negative test), RHACM4K-NEW-CCLM-01
    "clc-e2e-cclm-admin"           # CCLM full admin, RHACM4K-60989
)

# Build the final user list based on VIRT_TIER
VIRT_RBAC_TEST_USERS=()
VIRT_RBAC_TEST_USERS+=("${VIRT_USERS_RBAC_UI[@]}")
if [[ "${VIRT_TIER:-rbac-ui}" == "vm" || "${VIRT_TIER:-rbac-ui}" == "full" || "${VIRT_TIER:-rbac-ui}" == "custom" ]]; then
    VIRT_RBAC_TEST_USERS+=("${VIRT_USERS_VM[@]}")
fi
if [[ "${VIRT_TIER:-rbac-ui}" == "full" || "${VIRT_TIER:-rbac-ui}" == "custom" ]]; then
    VIRT_RBAC_TEST_USERS+=("${VIRT_USERS_CCLM[@]}")
fi

echo "[INFO] Creating ${#VIRT_RBAC_TEST_USERS[@]} RBAC test users (VIRT_TIER=${VIRT_TIER:-rbac-ui})..."
for user in "${VIRT_RBAC_TEST_USERS[@]}"; do
    htpasswd -b ${RBAC_DIR}/htpasswd "$user" ${RBAC_PASS}
done

# ============================================================
# Apply htpasswd secret and OAuth IDP
# ============================================================
set +e
oc delete secret clc-e2e-users -n openshift-config --ignore-not-found
oc create secret generic clc-e2e-users --from-file=htpasswd=${RBAC_DIR}/htpasswd -n openshift-config

rm ${RBAC_DIR}/htpasswd

if [[ -z "$(oc -n openshift-config get oauth cluster -o jsonpath='{.spec.identityProviders}')" ]]; then
  oc patch -n openshift-config oauth cluster --type json --patch '[{"op":"add","path":"/spec/identityProviders","value":[]}]'
fi
if [ ! $(oc -n openshift-config get oauth cluster -o jsonpath='{.spec.identityProviders[*].name}' | grep -o 'clc-e2e-htpasswd') ]; then
  oc patch -n openshift-config oauth cluster --type json --patch "$(cat ${SCRIPT_DIR}/e2e-rbac-auth.json)"
fi

# ============================================================
# Wait for OAuth pods to restart with new config
# ============================================================
echo "[INFO] Waiting for OAuth pods to restart (60s initial wait)..."
sleep 60

replicas=$(oc get deploy -n openshift-authentication oauth-openshift -o jsonpath='{.spec.replicas}')
for i in $(seq 1 60); do
  deployStatus=$(oc get deploy -n openshift-authentication oauth-openshift -o jsonpath='{.status}')
  readyReplicas=$(echo $deployStatus | jq -r .readyReplicas)
  currentReplicas=$(echo $deployStatus | jq -r .replicas)
  if [[ $readyReplicas == $replicas && $currentReplicas == $replicas ]]; then
    echo "[OK] OAuth deployment ready (${readyReplicas}/${replicas} replicas)."
    break
  else
    sleep 3
  fi
done

# ============================================================
# Validate user logins
# ============================================================
echo "[INFO] Validating base matrix user logins..."
for access in cluster ns; do
  for role in cluster-admin admin edit view group clusterset-admin clusterset-view clusterset-bind; do
    for j in $(seq 1 120); do
      oc login -u clc-e2e-${role}-${access} -p ${RBAC_PASS} --server ${HUB_API_URL} --insecure-skip-tls-verify=true 2>/dev/null
      if [[ $? != 0 ]]; then
        sleep 2
      else
        break
      fi
    done
  done
done

echo "[INFO] Validating ${#VIRT_RBAC_TEST_USERS[@]} RBAC test user logins..."
for user in "${VIRT_RBAC_TEST_USERS[@]}"; do
    for j in $(seq 1 120); do
        oc login -u "$user" -p ${RBAC_PASS} --server ${HUB_API_URL} --insecure-skip-tls-verify=true 2>/dev/null
        if [[ $? -ne 0 ]]; then
            sleep 2
        else
            echo "[OK] $user login validated."
            break
        fi
    done
done

# ============================================================
# Re-login as admin
# ============================================================
echo "[INFO] Re-logging in as admin..."
if [[ -n "${HUB_USER}" && -n "${HUB_PASSWORD}" ]]; then
    oc login -u ${HUB_USER} -p ${HUB_PASSWORD} --server ${HUB_API_URL} --insecure-skip-tls-verify=true
elif [[ -n "${CYPRESS_OPTIONS_HUB_USER}" && -n "${CYPRESS_OPTIONS_HUB_PASSWORD}" ]]; then
    oc login -u ${CYPRESS_OPTIONS_HUB_USER} -p ${CYPRESS_OPTIONS_HUB_PASSWORD} --server ${HUB_API_URL} --insecure-skip-tls-verify=true
elif [[ -n "${KUBEADMIN_PASSWORD}" ]]; then
    oc login -u kubeadmin -p ${KUBEADMIN_PASSWORD} --server ${HUB_API_URL} --insecure-skip-tls-verify=true
else
    echo "[WARN] No admin credentials found. Attempting kubeconfig restore..."
    oc whoami 2>/dev/null || echo "[ERROR] Cannot restore admin session."
fi

set +x
set -e
echo "[OK] gen-rbac.sh complete."
