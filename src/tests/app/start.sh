#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# ALC (Application Lifecycle) — Playwright tests under src/tests/app/.
# Layout: subscription/, argo/{push,pull,platform}/, flux/, openshift/, overview/, rbac/
# Invoked by the repo root ./start.sh alc [playwright args...]
#
# Defaults (when not overridden by env or CLI): --grep @alc, --project alc
# (The `alc` project is the only one that includes src/tests/app/**; `chromium` ignores app/**/*.spec.ts.)

set -e

_COMPONENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CONSOLE_E2E_ROOT="$(cd "${_COMPONENT_DIR}/../../.." && pwd)"

# shellcheck source=../../../scripts/lib/common.sh  # path relative to this file
source "${CONSOLE_E2E_ROOT}/scripts/lib/common.sh"
# shellcheck source=../../../scripts/lib/alc-env.sh
source "${CONSOLE_E2E_ROOT}/scripts/lib/alc-env.sh"

cd "${CONSOLE_E2E_ROOT}"

# Same variable names as login.sh "alc" / "alc-pw" blocks, without CYPRESS_ on console/cluster/store.
# ANSIBLE_* comes from repo-root .env (loaded by parent start.sh).
# This sources env/alc.local.env for ALC-only vars (GITHUB_USER/TOKEN, OBJECTSTORE_*).
console_e2e_export_alc_env

# Subscription-admin / ALC RBAC tests need htpasswd users and rbac-setup auth.
_alc_grep_blob="${PLAYWRIGHT_GREP:-}${GREP:-} $*"
if echo "${_alc_grep_blob}" | grep -qE '@subadmin|@alc-rbac|@e2e-rbac|RHACM4K-41355'; then
  export RBAC_DOMAIN=alc-rbac
  export RBAC_IDP=app-e2e-htpasswd
  export RBAC_TEST_PASSWORD="${RBAC_TEST_PASSWORD:-${HUB_PASSWORD:-}}"
  echo "ALC: subscription-admin RBAC detected — running gen-alc-rbac.sh (RBAC_DOMAIN=alc-rbac)"
  bash "${CONSOLE_E2E_ROOT}/scripts/alc/gen-alc-rbac.sh"
fi

# Enable GitOps / addon prep in globalSetup only for ALC runs (see src/global-setup/gitOpsPrep.ts).
export E2E_GITOPS_PREP="${E2E_GITOPS_PREP:-1}"

console_e2e_detect_manual_grep "$@"
if [ "${CONSOLE_E2E_MANUAL_GREP}" -eq 0 ] && [ -z "${PLAYWRIGHT_GREP:-}" ] && [ -z "${GREP:-}" ]; then
  export PLAYWRIGHT_GREP=@alc
  echo "ALC: defaulting PLAYWRIGHT_GREP=@alc (set PLAYWRIGHT_GREP or pass --grep to override)"
fi
if [ "${PLAYWRIGHT_TEST_MODE:-}" = "integration" ] && [ "${CONSOLE_E2E_MANUAL_GREP}" -eq 0 ] && [ -z "${PLAYWRIGHT_GREP_INVERT:-}" ]; then
  export PLAYWRIGHT_GREP_INVERT='@sample'
  echo "ALC: integration mode — PLAYWRIGHT_GREP_INVERT=@sample (sample specs excluded)"
fi

console_e2e_build_pw_grep_args "$@"

PW_PROJECT_ARGS=()
if [[ "$*" != *--project* ]]; then
  if echo "${_alc_grep_blob:-}" | grep -qE '@subadmin|@alc-rbac|@e2e-rbac|RHACM4K-41355'; then
    _proj="${PLAYWRIGHT_PROJECT:-alc-rbac}"
  else
    _proj="${PLAYWRIGHT_PROJECT:-alc}"
  fi
  echo "ALC: defaulting --project ${_proj} (pass --project or set PLAYWRIGHT_PROJECT to override)"
  PW_PROJECT_ARGS=(--project "${_proj}")
fi

echo "Running ALC Playwright tests (PLAYWRIGHT_TEST_MODE=${PLAYWRIGHT_TEST_MODE:-})..."
testCode=0
npx playwright test "${PW_GREP_ARGS[@]}" "${PW_PROJECT_ARGS[@]}" "$@" || testCode=$?

exit "${testCode}"
