#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# Search — Playwright tests under src/tests/search.
# Invoked by the repo root ./start.sh search [playwright args...]
#
# Defaults (when not overridden by env or CLI): --grep @search, --project search

set -e

_COMPONENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CONSOLE_E2E_ROOT="$(cd "${_COMPONENT_DIR}/../../.." && pwd)"

# shellcheck source=../../../scripts/lib/common.sh
source "${CONSOLE_E2E_ROOT}/scripts/lib/common.sh"

cd "${CONSOLE_E2E_ROOT}"

console_e2e_detect_manual_grep "$@"
if [ "${CONSOLE_E2E_MANUAL_GREP}" -eq 0 ] && [ -z "${PLAYWRIGHT_GREP:-}" ] && [ -z "${GREP:-}" ]; then
  export PLAYWRIGHT_GREP=@search
  echo "Search: defaulting PLAYWRIGHT_GREP=@search (set PLAYWRIGHT_GREP or pass --grep to override)"
fi

console_e2e_build_pw_grep_args "$@"

PW_PROJECT_ARGS=()
if [[ "$*" != *--project* ]]; then
  _proj="${PLAYWRIGHT_PROJECT:-search}"
  echo "Search: defaulting --project ${_proj} (pass --project or set PLAYWRIGHT_PROJECT to override)"
  PW_PROJECT_ARGS=(--project "${_proj}")
fi

echo "Running Search Playwright tests (PLAYWRIGHT_TEST_MODE=${PLAYWRIGHT_TEST_MODE:-})..."
testCode=0
npx playwright test "${PW_GREP_ARGS[@]}" "${PW_PROJECT_ARGS[@]}" "$@" || testCode=$?

exit "${testCode}"