#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# Shared helpers for console-e2e start scripts (sourced, not executed).

function errEcho {
  echo >&2 "$@"
}

# Load repo-root .env into the shell (export all assignments). Same universal vars Playwright reads via dotenv.
function console_e2e_load_dotenv {
  local root="${CONSOLE_E2E_ROOT:-}"
  if [ -z "${root}" ]; then
    return 0
  fi
  local f="${root}/.env"
  if [ -f "${f}" ]; then
    echo "Loading universal env from .env"
    set -a
    # shellcheck disable=SC1090
    source "${f}"
    set +a
  fi
}

function console_e2e_require_oc {
  # Plain `oc version` (no flags) contacts the current kubeconfig context and
  # exits non-zero when not logged in — that is not "oc missing".
  if ! command -v oc >/dev/null 2>&1; then
    errEcho "Missing dependency: oc (OpenShift CLI) not found in PATH"
    exit 1
  fi
}

function console_e2e_require_hub_env {
  if [ -z "${HUB_URL}" ]; then
    errEcho "Error: HUB_URL is not set."
    console_e2e_usage_main
  fi
  if [ -z "${HUB_PASSWORD}" ] && [ -z "${HUB_TOKEN}" ]; then
    errEcho "Error: HUB_PASSWORD or HUB_TOKEN must be set."
    console_e2e_usage_main
  fi
}

function console_e2e_usage_main {
  local me="${CONSOLE_E2E_MAIN_SCRIPT:-start.sh}"
  errEcho "usage: ${me} <component> [playwright args...]"
  errEcho
  errEcho "  Components:"
  errEcho "    alc         Application Lifecycle (src/tests/app); defaults: --grep @alc, --project alc"
  errEcho "    clc         Cluster lifecycle (src/tests/cluster); defaults: --grep @clc, --project cluster"
  errEcho "    grc         Governance (src/tests/governance); defaults: --grep @grc, --project governance"
  errEcho "    search      ACM Search (src/tests/search); defaults: --grep @search, --project search"
  errEcho "    fg-rbac     Fleet governance RBAC (src/tests/fg-rbac)"
  errEcho "    fleet-virt  Fleet virtualization (src/tests/fleet-virt)"
  errEcho
  errEcho "  Required env: HUB_URL, and HUB_PASSWORD or HUB_TOKEN"
  errEcho "  Optional: CONSOLE_USERNAME (default: kubeadmin), CONSOLE_IDP (default: kube:admin)"
  errEcho "  Optional: TEST_MODE — if set, overrides PLAYWRIGHT_TEST_MODE for the test run"
  errEcho "  Optional: OC_CLUSTER_URL / OC_CLUSTER_USER / OC_CLUSTER_PASS — override hub defaults"
  errEcho "  Optional: PLAYWRIGHT_GREP / GREP, PLAYWRIGHT_GREP_INVERT (when not set on CLI)"
  exit 1
}

function console_e2e_init_playwright_test_mode {
  # Default only when neither PLAYWRIGHT_TEST_MODE nor TEST_MODE is set.
  # After hub login, console_e2e_export_universal_env applies TEST_MODE → PLAYWRIGHT_TEST_MODE.
  if [ -z "${PLAYWRIGHT_TEST_MODE:-}" ] && [ -z "${TEST_MODE:-}" ]; then
    echo "PLAYWRIGHT_TEST_MODE not exported; setting to 'e2e' mode"
    export PLAYWRIGHT_TEST_MODE=e2e
  elif [ -z "${PLAYWRIGHT_TEST_MODE:-}" ] && [ -n "${TEST_MODE:-}" ]; then
    export PLAYWRIGHT_TEST_MODE="${TEST_MODE}"
    echo "PLAYWRIGHT_TEST_MODE=${PLAYWRIGHT_TEST_MODE} (from TEST_MODE)"
  fi
}

function console_e2e_cd_repo {
  if [ -z "${CONSOLE_E2E_ROOT:-}" ]; then
    errEcho "Internal error: CONSOLE_E2E_ROOT is not set"
    exit 1
  fi
  cd "${CONSOLE_E2E_ROOT}" || exit 1
}

# Optional console UI identity (auth.setup). Password is always HUB_PASSWORD (see getHubAuth).
function console_e2e_export_console_login_env {
  export CONSOLE_USERNAME="${CONSOLE_USERNAME:-kubeadmin}"
  export CONSOLE_IDP="${CONSOLE_IDP:-kube:admin}"
}

# Universal Playwright / hybrid env for every component (after successful hub API login).
function console_e2e_export_universal_env {
  export OC_CLUSTER_URL="${OC_CLUSTER_URL:-${HUB_URL:-}}"
  export OC_CLUSTER_USER="${OC_CLUSTER_USER:-kubeadmin}"
  if [ -n "${HUB_PASSWORD:-}" ]; then
    export OC_CLUSTER_PASS="${OC_CLUSTER_PASS:-${HUB_PASSWORD}}"
  fi

  if [ -n "${TEST_MODE:-}" ]; then
    export PLAYWRIGHT_TEST_MODE="${TEST_MODE}"
    echo "Universal env: PLAYWRIGHT_TEST_MODE=${PLAYWRIGHT_TEST_MODE} (from TEST_MODE)"
  fi

  if [ -z "${BASE_URL:-}" ] && command -v oc >/dev/null 2>&1; then
    local _bu
    if _bu=$(oc whoami --show-console 2>/dev/null) && [ -n "${_bu}" ]; then
      export BASE_URL="${_bu}"
      echo "Universal env: BASE_URL set from oc whoami --show-console"
    else
      errEcho "Universal env: warning — BASE_URL unset; oc whoami --show-console failed (set BASE_URL if tests need it)"
    fi
  fi
}

function console_e2e_oc_login_hub {
  echo "Logging into Kube API server..."
  local login_rc=0
  if [ -n "${HUB_TOKEN}" ]; then
    oc login --server="${HUB_URL}" --token="${HUB_TOKEN}" --insecure-skip-tls-verify
    login_rc=$?
  else
    local _had_xtrace=0
    case $- in *x*) _had_xtrace=1 ;; esac
    set +x
    oc login --server="${HUB_URL}" -u "${CONSOLE_USERNAME}" -p "${HUB_PASSWORD}" --insecure-skip-tls-verify
    login_rc=$?
    if [ "${_had_xtrace}" -eq 1 ]; then set -x; fi
  fi
  if [ "${login_rc}" -ne 0 ]; then
    errEcho "oc login failed (exit ${login_rc})"
    exit "${login_rc}"
  fi
}

function console_e2e_oc_whoami_version {
  oc whoami
  echo "=== Version (oc) ==="
  oc version 2>/dev/null || true
}

function console_e2e_ensure_npm_deps {
  if [ ! -d "${CONSOLE_E2E_ROOT}/node_modules" ]; then
    echo "=== Installing dependencies ==="
    (cd "${CONSOLE_E2E_ROOT}" && npm ci)
  fi
}

# Sets CONSOLE_E2E_MANUAL_GREP=1 if any arg is a Playwright grep flag.
function console_e2e_detect_manual_grep {
  CONSOLE_E2E_MANUAL_GREP=0
  local _a
  for _a in "$@"; do
    case "${_a}" in
      --grep | --grep-invert | -g)
        CONSOLE_E2E_MANUAL_GREP=1
        return
        ;;
    esac
  done
}

# Populates PW_GREP_ARGS from env when CONSOLE_E2E_MANUAL_GREP=0.
function console_e2e_build_pw_grep_args {
  PW_GREP_ARGS=()
  if [ "${CONSOLE_E2E_MANUAL_GREP:-0}" -eq 1 ]; then
    return
  fi
  local _g="${PLAYWRIGHT_GREP:-${GREP:-}}"
  if [ -n "${_g}" ]; then
    echo "Applying PLAYWRIGHT_GREP (from env): ${_g}"
    PW_GREP_ARGS+=(--grep "${_g}")
  fi
  if [ -n "${PLAYWRIGHT_GREP_INVERT:-}" ]; then
    echo "Applying PLAYWRIGHT_GREP_INVERT (from env): ${PLAYWRIGHT_GREP_INVERT}"
    PW_GREP_ARGS+=(--grep-invert "${PLAYWRIGHT_GREP_INVERT}")
  fi
}
