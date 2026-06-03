#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# Fleet Virt — Playwright tests under src/tests/fleet-virt.
# Invoked by the repo root ./start.sh fleet-virt [playwright args...]
#
# Flow:
#   1. Source common.sh + rbac-env.sh (spoke discovery, tier detection)
#   2. Run gen-rbac.sh + setup-test-roles.sh unless SKIP_SETUP
#   3. Validate prerequisites (CNV on spoke)
#   4. Run Playwright with --project=fleet-virt

set -e

_COMPONENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CONSOLE_E2E_ROOT="$(cd "${_COMPONENT_DIR}/../../.." && pwd)"

# shellcheck source=../../../scripts/lib/common.sh
source "${CONSOLE_E2E_ROOT}/scripts/lib/common.sh"
# shellcheck source=../../../scripts/lib/rbac-env.sh
source "${CONSOLE_E2E_ROOT}/scripts/lib/rbac-env.sh"

cd "${CONSOLE_E2E_ROOT}"

# ── RBAC Setup (users + roles) ──────────────────────────────
if [[ "${SKIP_SETUP}" != "true" ]]; then
    echo "[INFO] Running RBAC user provisioning (gen-rbac.sh)..."
    bash "${CONSOLE_E2E_ROOT}/scripts/rbac/gen-rbac.sh"

    echo "[INFO] Running RBAC role assignment (setup-test-roles.sh)..."
    bash "${CONSOLE_E2E_ROOT}/scripts/rbac/setup-test-roles.sh"
else
    echo "[INFO] SKIP_SETUP=true -- skipping RBAC provisioning."
fi

# ── Prerequisites validation ────────────────────────────────
echo "[INFO] Validating Fleet Virt prerequisites..."
if [[ -n "${SPOKE_CLUSTER}" ]]; then
    CNV_CSV=$(oc get csv -n openshift-cnv --no-headers 2>/dev/null | grep kubevirt-hyperconverged || true)
    if [[ -n "${CNV_CSV}" ]]; then
        CNV_VERSION=$(echo "${CNV_CSV}" | awk '{print $3}')
        echo "[OK] CNV ${CNV_VERSION} found on hub."
    else
        echo "[WARN] CNV not detected on hub. VM-dependent tests may fail."
    fi
else
    echo "[WARN] No spoke cluster available. Spoke-dependent tests will be skipped."
fi

# ── Ensure Playwright browsers are installed ────────────────
npx playwright install chromium 2>/dev/null || echo "[WARN] Playwright browser install skipped (may already be available)"

# ── Playwright Test Execution ───────────────────────────────
PW_PROJECT_ARGS=()
if [[ "$*" != *--project* ]]; then
    _proj="fleet-virt"
    echo "Fleet Virt: defaulting --project ${_proj}"
    PW_PROJECT_ARGS=(--project "${_proj}")
fi

echo "Running Fleet Virt Playwright tests (VIRT_TIER=${VIRT_TIER:-not set}, SPOKE=${SPOKE_CLUSTER:-none})..."
export RBAC_DOMAIN=fg-rbac
testCode=0
npx playwright test "${PW_PROJECT_ARGS[@]}" "$@" || testCode=$?

exit "${testCode}"
