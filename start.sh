#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# Main entry: hub login, dependencies, then dispatch to a component start script.
# Add new components by extending the case statement below and adding
# e.g. src/tests/<area>/start.sh
#
# Usage: ./start.sh <component> [playwright args...]
#   e.g. ./start.sh alc
#   e.g. ./start.sh alc --grep @app --headed
#   e.g. ./start.sh clc
#   e.g. ./start.sh grc --grep RHACM4K-64217
#
# Universal variables: put them in repo-root `.env` (gitignored) or export in your shell.
# start.sh loads `.env` before oc login so HUB_* and CONSOLE_* work from one file.
#
# Required (from env or .env):
#   HUB_URL          — cluster API URL (e.g. https://api.<cluster>.<domain>:6443)
#   HUB_PASSWORD     — hub password (kubeadmin by default), or use HUB_TOKEN instead
#
# Optional:
#   TEST_MODE              — if set, sets PLAYWRIGHT_TEST_MODE for Playwright
#   OC_CLUSTER_*           — optional overrides (defaults from HUB_URL / HUB_PASSWORD after login)
#   PLAYWRIGHT_GREP, GREP, PLAYWRIGHT_GREP_INVERT — forwarded to component scripts
#     (component may apply its own defaults, e.g. ALC defaults to @alc)
#
# After login, start.sh exports universal vars: BASE_URL (from oc), OC_CLUSTER_*, PLAYWRIGHT_TEST_MODE.

export CONSOLE_E2E_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CONSOLE_E2E_MAIN_SCRIPT="$(basename "${BASH_SOURCE[0]}")"

# shellcheck source=scripts/lib/common.sh
source "${CONSOLE_E2E_ROOT}/scripts/lib/common.sh"

console_e2e_load_dotenv

console_e2e_require_oc
console_e2e_require_hub_env

echo "Initiating tests..."

console_e2e_init_playwright_test_mode
console_e2e_cd_repo
console_e2e_export_console_login_env

console_e2e_oc_login_hub

# Hub console URL + cluster API context for all components (Playwright inherits this process env).
console_e2e_export_universal_env

set -e

console_e2e_oc_whoami_version
console_e2e_ensure_npm_deps

COMPONENT="${1:-}"
if [ -z "${COMPONENT}" ]; then
  errEcho "Error: missing component name."
  console_e2e_usage_main
fi
shift

case "${COMPONENT}" in
  alc | ALC)
    exec bash "${CONSOLE_E2E_ROOT}/src/tests/app/start.sh" "$@"
    ;;
  clc | CLC)
    exec bash "${CONSOLE_E2E_ROOT}/src/tests/cluster/start.sh" "$@"
    ;;
  grc | GRC)
    exec bash "${CONSOLE_E2E_ROOT}/src/tests/governance/start.sh" "$@"
    ;;
  fg-rbac | FG-RBAC)
    exec bash "${CONSOLE_E2E_ROOT}/src/tests/fg-rbac/start.sh" "$@"
    ;;
  fleet-virt | FLEET-VIRT | virt | VIRT)
    exec bash "${CONSOLE_E2E_ROOT}/src/tests/fleet-virt/start.sh" "$@"
    ;;
  *)
    errEcho "Unknown component: ${COMPONENT}"
    console_e2e_usage_main
    ;;
esac
