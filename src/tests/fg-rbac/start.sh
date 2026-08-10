#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# FG-RBAC / Fleet Virt — Playwright tests under src/tests/fg-rbac.
# Invoked by the repo root ./start.sh fg-rbac [playwright args...]
#
# Flow:
#   1. Source common.sh + rbac-env.sh (spoke discovery, tier detection)
#   2. Run gen-rbac.sh (htpasswd users + OAuth IDP) unless SKIP_SETUP
#   3. Run install-glauth.sh (LDAP IDP + group sync) unless SKIP_SETUP
#   4. Run setup-test-roles.sh (MCRAs, groups, placements) unless SKIP_SETUP
#   5. Run Playwright with --project=fg-rbac and RBAC_DOMAIN=fg-rbac

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

    echo "[INFO] Installing LDAP identity provider (install-glauth.sh)..."
    export E2E_NONINTERACTIVE=true
    bash "${CONSOLE_E2E_ROOT}/scripts/ldap/install-glauth.sh"

    console_e2e_oc_login_hub

    echo "[INFO] Running RBAC role assignment (setup-test-roles.sh)..."
    bash "${CONSOLE_E2E_ROOT}/scripts/rbac/setup-test-roles.sh"
else
    echo "[INFO] SKIP_SETUP=true -- skipping RBAC provisioning."
fi

# ── Ensure Playwright browsers are installed ────────────────
npx playwright install chromium 2>/dev/null || echo "[WARN] Playwright browser install skipped (may already be available)"

# ── Playwright Test Execution ───────────────────────────────
PW_PROJECT_ARGS=()
if [[ "$*" != *--project* ]]; then
    _proj="fg-rbac"
    echo "FG-RBAC: defaulting --project ${_proj}"
    PW_PROJECT_ARGS=(--project "${_proj}")
fi

# ── Tier-Based Tag Filtering ────────────────────────────────
# When no explicit --grep is provided (CLI or CUSTOMER_TAGS), filter tests
# by platform tier to match the Cypress tier behavior:
#   full/custom (Azure) → all tests
#   vm (BareMetal)      → exclude @cclm
#   rbac-ui (Other)     → only @fg-rbac, exclude @fleet-virt and @cclm
TIER_GREP_ARGS=()
if [[ "$*" != *--grep* ]] && [[ -z "${CUSTOMER_TAGS:-}" ]]; then
    case "${VIRT_TIER:-}" in
        "full"|"custom")
            echo "[INFO] Tier '${VIRT_TIER}': running all test tags (no filter)"
            ;;
        "vm")
            echo "[INFO] Tier 'vm': excluding @cclm tests"
            TIER_GREP_ARGS=(--grep-invert '@cclm')
            ;;
        "rbac-ui")
            echo "[INFO] Tier 'rbac-ui': running @fg-rbac only, excluding @fleet-virt and @cclm"
            TIER_GREP_ARGS=(--grep '@fg-rbac' --grep-invert '@fleet-virt|@cclm')
            ;;
        *)
            echo "[INFO] Tier not set or unknown ('${VIRT_TIER:-}'): running all tests"
            ;;
    esac
fi

echo "Running FG-RBAC Playwright tests (VIRT_TIER=${VIRT_TIER:-not set})..."
export RBAC_DOMAIN=fg-rbac
testCode=0
npx playwright test "${PW_PROJECT_ARGS[@]}" "${TIER_GREP_ARGS[@]}" "$@" || testCode=$?

exit "${testCode}"
