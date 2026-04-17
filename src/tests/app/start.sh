#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# ALC (Application Lifecycle) — Playwright tests under src/tests/app.
# Invoked by the repo root ./start.sh alc [playwright args...]
#
# Defaults (when not overridden by env or CLI): --grep @alc, --project chromium
# (matches external ALC CI job defaults, e.g. acmqe-autotest Jenkinsfile_console_alc.)

set -e

_COMPONENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CONSOLE_E2E_ROOT="$(cd "${_COMPONENT_DIR}/../../.." && pwd)"

# shellcheck source=../../../scripts/lib/common.sh  # path relative to this file
source "${CONSOLE_E2E_ROOT}/scripts/lib/common.sh"
# shellcheck source=../../../scripts/lib/alc-env.sh
source "${CONSOLE_E2E_ROOT}/scripts/lib/alc-env.sh"

cd "${CONSOLE_E2E_ROOT}"

# Same variable names as login.sh "alc" / "alc-pw" blocks, without CYPRESS_ on console/cluster/store.
# ANSIBLE_* comes from repo-root .env (loaded by parent start.sh); this sources env/alc.local.env for OBJECTSTORE_* only.
console_e2e_export_alc_env

console_e2e_detect_manual_grep "$@"
if [ "${CONSOLE_E2E_MANUAL_GREP}" -eq 0 ] && [ -z "${PLAYWRIGHT_GREP:-}" ] && [ -z "${GREP:-}" ]; then
  export PLAYWRIGHT_GREP=@alc
  echo "ALC: defaulting PLAYWRIGHT_GREP=@alc (set PLAYWRIGHT_GREP or pass --grep to override)"
fi

console_e2e_build_pw_grep_args "$@"

PW_PROJECT_ARGS=()
if [[ "$*" != *--project* ]]; then
  _proj="${PLAYWRIGHT_PROJECT:-chromium}"
  echo "ALC: defaulting --project ${_proj} (pass --project or set PLAYWRIGHT_PROJECT to override)"
  PW_PROJECT_ARGS=(--project "${_proj}")
fi

echo "Running ALC Playwright tests (PLAYWRIGHT_TEST_MODE=${PLAYWRIGHT_TEST_MODE:-})..."
testCode=0
npx playwright test "${PW_GREP_ARGS[@]}" "${PW_PROJECT_ARGS[@]}" "$@" || testCode=$?

exit "${testCode}"
