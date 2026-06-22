#!/usr/bin/env bash
# Copyright (c) 2025 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
#
# Provision ALC htpasswd RBAC users (Cypress application-ui-test parity).
# Creates app-e2e-htpasswd IDP users and cluster role bindings for subscription-admin tests.
#
# Usage (from repo root, after hub oc login as kubeadmin):
#   RBAC_TEST_PASSWORD="${HUB_PASSWORD}" ./scripts/alc/gen-alc-rbac.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MARKER="${ROOT}/.auth/alc-rbac-users-ready"
RBAC_PASS="${RBAC_TEST_PASSWORD:-${HUB_PASSWORD:-}}"
HTPASSWD_FILE="$(mktemp)"
AUTH_JSON="${ROOT}/src/templates/app/rbac/e2e-rbac-auth.json"
CRB_YAML="${ROOT}/src/templates/app/rbac/e2e-rbac-clusterrolebinding.yaml"
SECRET_NAME="app-e2e-users"
IDP_NAME="app-e2e-htpasswd"
CLUSTER_MANAGER_ADMIN="app-test-cluster-manager-admin"

if [ -f "${MARKER}" ]; then
  echo "[alc-rbac] Users already provisioned (${MARKER}); skipping."
  exit 0
fi

if [ -z "${RBAC_PASS}" ]; then
  echo "[alc-rbac] ERROR: set RBAC_TEST_PASSWORD or HUB_PASSWORD" >&2
  exit 1
fi

if ! command -v htpasswd >/dev/null 2>&1; then
  echo "[alc-rbac] ERROR: htpasswd not found in PATH" >&2
  exit 1
fi

echo "[alc-rbac] Creating htpasswd users..."
: > "${HTPASSWD_FILE}"
htpasswd -b -B "${HTPASSWD_FILE}" "${CLUSTER_MANAGER_ADMIN}" "${RBAC_PASS}"

if oc get secret "${SECRET_NAME}" -n openshift-config >/dev/null 2>&1; then
  oc create secret generic "${SECRET_NAME}" \
    --from-file=htpasswd="${HTPASSWD_FILE}" \
    -n openshift-config \
    --dry-run=client -o yaml | oc replace -f -
else
  oc create secret generic "${SECRET_NAME}" \
    --from-file=htpasswd="${HTPASSWD_FILE}" \
    -n openshift-config
fi
rm -f "${HTPASSWD_FILE}"

existing_idps="$(oc get oauth cluster -o jsonpath='{.spec.identityProviders[*].name}' 2>/dev/null || true)"
if ! echo "${existing_idps}" | grep -qw "${IDP_NAME}"; then
  echo "[alc-rbac] Patching OAuth cluster with ${IDP_NAME} IDP..."
  oc patch oauth cluster --type json --patch "$(cat "${AUTH_JSON}")"
fi

echo "[alc-rbac] Applying cluster role bindings..."
oc apply -f "${CRB_YAML}"

echo "[alc-rbac] Granting subscription-admin to ${CLUSTER_MANAGER_ADMIN}..."
oc adm policy add-cluster-role-to-user \
  --rolebinding-name open-cluster-management:subscription-admin \
  open-cluster-management:subscription-admin \
  "${CLUSTER_MANAGER_ADMIN}" || true

mkdir -p "$(dirname "${MARKER}")"
date -u +%Y-%m-%dT%H:%M:%SZ > "${MARKER}"
echo "[alc-rbac] Done. IDP may take up to 60s to propagate before first UI login."
