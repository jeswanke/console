#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# ALC-only env: optional env/alc.local.env (object store). Ansible: repo-root .env (ANSIBLE_*).
# Universal vars (HUB_*, CONSOLE_*, BASE_URL, OC_CLUSTER_*, PLAYWRIGHT_TEST_MODE)
# are set by root start.sh via scripts/lib/common.sh after hub login.

function console_e2e_load_alc_local_env {
  local root="${CONSOLE_E2E_ROOT:-}"
  if [ -z "${root}" ]; then
    echo >&2 "console_e2e_load_alc_local_env: CONSOLE_E2E_ROOT is not set"
    return 1
  fi
  local f="${root}/env/alc.local.env"
  if [ -f "${f}" ]; then
    echo "ALC env: loading ${f}"
    set -a
    # shellcheck disable=SC1090
    source "${f}"
    set +a
  fi
}

function console_e2e_export_alc_env {
  console_e2e_load_alc_local_env
}
