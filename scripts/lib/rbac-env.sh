#!/usr/bin/env bash

# Description:
#     RBAC environment setup: spoke discovery, tier detection, env export.
#     Sourced by src/tests/fg-rbac/start.sh before running gen-rbac.sh.
#
# Exports:
#     SPOKE_CLUSTERS        - Space-separated validated spoke cluster names
#     SPOKE_CLUSTER         - Primary spoke (first in list)
#     VIRT_SPOKE_CLUSTER    - Comma-separated spokes (for Playwright env)
#     VIRT_TIER             - rbac-ui | vm | full | custom
#     RBAC_SPOKE_CLUSTER    - Same as SPOKE_CLUSTER (for Playwright config)

echo ""
echo "============================================================"
echo "  RBAC Environment Setup"
echo "============================================================"

# ============================================================
# Step 1: Resolve spoke clusters (provided or auto-discovered)
# ============================================================
echo "[INFO] Step 1: Resolving spoke clusters..."
if [[ -z "${VIRT_SPOKE_CLUSTER}" ]]; then
    echo "[INFO] No spoke clusters provided. Auto-discovering ready spokes from hub..."
    AUTO_SPOKES=$(oc get managedclusters --no-headers 2>/dev/null \
        | awk '$1 != "local-cluster" && $(NF-1) == "True" {print $1}' \
        | tr '\n' ',' | sed 's/,$//')

    if [[ -z "${AUTO_SPOKES}" ]]; then
        echo "[WARN] No ready spoke clusters found. Spoke-dependent tests will be skipped."
        export SPOKE_CLUSTERS=""
        export SPOKE_CLUSTER=""
        export VIRT_SPOKE_CLUSTER=""
    else
        echo "[OK] Auto-discovered ready spokes: ${AUTO_SPOKES}"
        VIRT_SPOKE_CLUSTER="${AUTO_SPOKES}"
    fi
fi
echo "[OK] Using spokes: ${VIRT_SPOKE_CLUSTER:-none}"

# ============================================================
# Step 2: Validate each spoke
# ============================================================
echo ""
echo "[INFO] Step 2: Validating spoke cluster(s)..."
SPOKE_LIST="${VIRT_SPOKE_CLUSTER//,/ }"
SPOKE_COUNT=$(echo "${SPOKE_LIST}" | wc -w | tr -d ' ')
echo "[INFO] Found ${SPOKE_COUNT} spoke cluster(s) to validate"

VALIDATED_SPOKES=""
FIRST_SPOKE=""
VALIDATED_COUNT=0

for spoke in ${SPOKE_LIST}; do
    echo "[INFO] Validating spoke: ${spoke}"
    if ! oc get managedcluster "${spoke}" &>/dev/null; then
        echo "[WARN] Spoke '${spoke}' does not exist as a ManagedCluster. Skipping."
        continue
    fi

    SPOKE_AVAILABLE=$(oc get managedcluster "${spoke}" \
        -o jsonpath='{.status.conditions[?(@.type=="ManagedClusterConditionAvailable")].status}' 2>/dev/null)
    if [[ "${SPOKE_AVAILABLE}" != "True" ]]; then
        echo "[WARN] Spoke '${spoke}' is not available (Available=${SPOKE_AVAILABLE}). Skipping."
        continue
    fi

    echo "[OK] Spoke '${spoke}' is available."
    VALIDATED_SPOKES="${VALIDATED_SPOKES} ${spoke}"
    VALIDATED_COUNT=$((VALIDATED_COUNT + 1))
    if [[ -z "${FIRST_SPOKE}" ]]; then
        FIRST_SPOKE="${spoke}"
    fi
done

VALIDATED_SPOKES=$(echo "${VALIDATED_SPOKES}" | xargs)

# ============================================================
# Step 3: Detect platform and determine test tier
# ============================================================
echo ""
echo "[INFO] Step 3: Detecting platform and tier..."

INFRA_PLATFORM=$(oc get infrastructure cluster -o jsonpath='{.status.platformStatus.type}' 2>/dev/null || echo "Unknown")
echo "[INFO] Infrastructure platform: ${INFRA_PLATFORM}"

if [[ -n "${CUSTOMER_TAGS}" ]]; then
    VIRT_TIER="custom"
elif [[ "${INFRA_PLATFORM}" == "Azure" ]]; then
    VIRT_TIER="full"
elif [[ "${INFRA_PLATFORM}" == "BareMetal" ]]; then
    VIRT_TIER="vm"
else
    VIRT_TIER="rbac-ui"
fi

echo "[OK] VIRT_TIER=${VIRT_TIER}"

# ============================================================
# Step 4: Export environment variables
# ============================================================
echo ""
echo "[INFO] Step 4: Setting environment variables..."
export SPOKE_CLUSTERS="${VALIDATED_SPOKES}"
export SPOKE_CLUSTER="${FIRST_SPOKE}"
export VIRT_SPOKE_CLUSTER="$(echo ${VALIDATED_SPOKES} | tr ' ' ',')"
export VIRT_TIER
export RBAC_SPOKE_CLUSTER="${FIRST_SPOKE}"

echo "[OK] SPOKE_CLUSTERS=${SPOKE_CLUSTERS}"
echo "[OK] SPOKE_CLUSTER=${SPOKE_CLUSTER}"
echo "[OK] VIRT_SPOKE_CLUSTER=${VIRT_SPOKE_CLUSTER}"
echo "[OK] RBAC_SPOKE_CLUSTER=${RBAC_SPOKE_CLUSTER}"
echo "[OK] VIRT_TIER=${VIRT_TIER}"

echo ""
echo "============================================================"
echo "  RBAC Environment Setup Complete"
echo "  Spoke(s): ${SPOKE_CLUSTERS:-none}"
echo "  Primary:  ${SPOKE_CLUSTER:-none}"
echo "  Count:    ${VALIDATED_COUNT}"
echo "  Tier:     ${VIRT_TIER}"
echo "============================================================"
echo ""
