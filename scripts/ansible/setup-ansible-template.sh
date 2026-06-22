#!/usr/bin/env bash
# Resolve AAP env from either explicit values or cluster discovery, ensure
# alc-ansible-secret, and bootstrap AWX templates used by ALC tests.
set -euo pipefail

LOG_PREFIX="[Ansible prep]"
AAP_NAMESPACE="${AAP_NAMESPACE:-aap}"
TOWER_USER="${ANSIBLE_TOWER_USER:-admin}"
TEMPLATE_REPO="${TEMPLATE_REPO:-https://github.com/stolostron/sample-ansible-playbooks.git}"
BOOTSTRAP_AWX="${E2E_ANSIBLE_AWX_BOOTSTRAP:-1}"

log() { echo "${LOG_PREFIX} $*"; }

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

# AWX list JSON .count, or 0 if awx/jq fails (caller must have verified awx + jq).
awx_list_count() {
  local kind=$1 name=$2 n=0
  n="$(awx -k "${kind}" list --name "${name}" -f json 2>/dev/null | jq '.count // 0' 2>/dev/null)" || n=0
  printf '%s' "${n}"
}

resolve_from_cluster() {
  log "Step: discover controller — reading routes and secrets in namespace ${AAP_NAMESPACE}."
  local route=""
  route="$(oc get route -n "${AAP_NAMESPACE}" -o jsonpath='{.items[1].spec.host}' 2>/dev/null || true)"
  if [[ -z "${route}" ]]; then
    route="$(oc get route -n "${AAP_NAMESPACE}" -o jsonpath='{.items[0].spec.host}' 2>/dev/null || true)"
  fi

  export ANSIBLE_URL="https://${route}"
  export ANSIBLE_TOWER_PASSWORD="$(
    oc get secrets -n "${AAP_NAMESPACE}" auto-con-admin-password -o jsonpath='{.data.password}' 2>/dev/null | base64 -d || true
  )"
  export ANSIBLE_TOKEN="$(
    oc get secrets -n "${AAP_NAMESPACE}" auto-con-admin-token -o jsonpath='{.data.token}' 2>/dev/null | base64 -d || true
  )"

  if [[ -n "${route}" ]]; then
    log "Step: discover controller — route host resolved (ANSIBLE_URL will use https://${route})."
  else
    log "Step: discover controller — no route host found in ${AAP_NAMESPACE} (check AAP install / AAP_NAMESPACE)."
  fi
  if [[ -n "${ANSIBLE_TOWER_PASSWORD:-}" ]]; then
    log "Step: discover controller — admin password secret present."
  else
    log "Step: discover controller — admin password secret missing or empty."
  fi
  if [[ -n "${ANSIBLE_TOKEN:-}" ]]; then
    log "Step: discover controller — admin token secret present."
  else
    log "Step: discover controller — admin token secret missing or empty."
  fi
}

mint_token_from_password() {
  if ! command -v jq >/dev/null 2>&1; then
    log "jq is required to mint ANSIBLE_TOKEN from ANSIBLE_URL + password (install jq or set ANSIBLE_TOKEN)."
    return 1
  fi
  log "Step: mint token — POST token to controller (trying gateway / controller / v2 paths)."
  local base="${ANSIBLE_URL%/}"
  local resp token endpoint
  for endpoint in "/api/gateway/v1/tokens/" "/api/controller/v2/tokens/" "/api/v2/tokens/"; do
    log "Step: mint token — trying ${endpoint}"
    resp="$(
      curl -ksS -u "${TOWER_USER}:${ANSIBLE_TOWER_PASSWORD}" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"description":"console-e2e ansible prep"}' \
        "${base}${endpoint}" 2>/dev/null || true
    )"
    token="$(echo "${resp}" | jq -r '.token // .access_token // empty' 2>/dev/null || true)"
    if [[ -n "${token}" ]]; then
      export ANSIBLE_TOKEN="${token}"
      log "Step: mint token — success (${endpoint})."
      return 0
    fi
  done
  return 1
}

ensure_ansible_secret() {
  local name="alc-ansible-secret"
  local namespace="default"
  local host_b64 token_b64 tmp

  log "Step: cluster secret — ensure ${namespace}/${name} for ALC tests."
  if oc get secret "${name}" -n "${namespace}" >/dev/null 2>&1; then
    log "Step: cluster secret — ${namespace}/${name} already exists; skipping apply."
    return
  fi

  log "Step: cluster secret — applying manifest (oc apply)."
  host_b64="$(printf '%s' "${ANSIBLE_URL}" | base64 | tr -d '\n')"
  token_b64="$(printf '%s' "${ANSIBLE_TOKEN}" | base64 | tr -d '\n')"
  tmp="$(mktemp)"
  trap 'rm -f "${tmp}"' RETURN
  cat >"${tmp}" <<EOF
apiVersion: v1
kind: Secret
metadata:
  labels:
    cluster.open-cluster-management.io/credentials: ""
    cluster.open-cluster-management.io/type: ans
  name: ${name}
  namespace: ${namespace}
type: Opaque
data:
  host: ${host_b64}
  token: ${token_b64}
EOF
  oc apply -f "${tmp}"
  trap - RETURN
  rm -f "${tmp}"
  log "Step: cluster secret — created ${namespace}/${name}."
}

bootstrap_awx_templates() {
  log "Step: AWX bootstrap — begin (repo=${TEMPLATE_REPO})."
  if ! command -v awx >/dev/null 2>&1; then
    log "Skipping AWX template bootstrap (awx CLI not found)."
    return
  fi
  if ! command -v jq >/dev/null 2>&1; then
    log "Skipping AWX template bootstrap (jq not found)."
    return
  fi

  export CONTROLLER_HOST="${ANSIBLE_URL}"
  export CONTROLLER_VERIFY_SSL="${CONTROLLER_VERIFY_SSL:-False}"
  export CONTROLLER_OAUTH_TOKEN="${ANSIBLE_TOKEN}"
  unset CONTROLLER_USERNAME CONTROLLER_PASSWORD

  log "Step: AWX bootstrap — verify controller auth (awx me)."
  if ! awx -k me -f json >/dev/null 2>&1; then
    log "Step: AWX bootstrap — OAuth token rejected or unavailable; trying username/password."
    export CONTROLLER_USERNAME="${TOWER_USER}"
    export CONTROLLER_PASSWORD="${ANSIBLE_TOWER_PASSWORD}"
    unset CONTROLLER_OAUTH_TOKEN
    if ! awx -k me -f json >/dev/null 2>&1; then
      log "Skipping AWX template bootstrap (controller auth failed)."
      return
    fi
  fi
  log "Step: AWX bootstrap — controller auth OK."

  local -a projects=("Auto_CLC_Sample_Project" "Auto_CLC_Ansible_Tag_Project" "Auto_CLC_Ansible_Tag_Project")
  local -a templates=("Auto_CLC_Sample_Template" "CLC_Tag_Job_Template" "CLC_Multiple_Tags_Job_Template")
  local -a playbooks=("hello_world.yml" "tags/one_tag.yml" "tags/multiple_tags.yml")
  local -a inventories=("CLC Demo Inventory" "CLC Tag Inventory" "CLC Tag Inventory")
  local i

  log "Step: AWX bootstrap — remove stale job templates (if present)."
  for i in "${!templates[@]}"; do
    if [[ "$(awx_list_count job_templates "${templates[$i]}")" -gt 0 ]]; then
      awx -k job_templates delete --name "${templates[$i]}" -f human || true
    fi
  done
  log "Step: AWX bootstrap — remove stale inventories (if present)."
  for i in "${!inventories[@]}"; do
    if [[ "$(awx_list_count inventory "${inventories[$i]}")" -gt 0 ]]; then
      awx -k inventory delete --name "${inventories[$i]}" -f human || true
    fi
  done
  log "Step: AWX bootstrap — remove stale projects (if present)."
  for i in "${!projects[@]}"; do
    if [[ "$(awx_list_count projects "${projects[$i]}")" -gt 0 ]]; then
      awx -k projects delete --name "${projects[$i]}" -f human || true
    fi
  done

  # Projects/inventories repeat for i=1 and i=2 (same SCM/inventory, different job templates).
  # Only create each unique project/inventory once, then attach each job template.
  local prev_project="" prev_inventory=""
  log "Step: AWX bootstrap — create projects, inventories, and job templates (${#projects[@]} bundles)."
  for i in "${!projects[@]}"; do
    log "Step: AWX bootstrap — bundle $((i + 1))/${#projects[@]}: template=${templates[$i]} playbook=${playbooks[$i]}"
    if [[ "${projects[$i]}" != "${prev_project}" ]]; then
      log "Step: AWX bootstrap — creating project ${projects[$i]}."
      awx -k projects create --wait \
        --organization 1 --name="${projects[$i]}" \
        --scm_type git --scm_url "${TEMPLATE_REPO}" \
        -f human
      prev_project="${projects[$i]}"
    else
      log "Step: AWX bootstrap — reusing project ${projects[$i]}."
    fi
    if [[ "${inventories[$i]}" != "${prev_inventory}" ]]; then
      log "Step: AWX bootstrap — creating inventory ${inventories[$i]}."
      awx -k inventory create --wait --organization 1 --name="${inventories[$i]}" -f human
      prev_inventory="${inventories[$i]}"
    else
      log "Step: AWX bootstrap — reusing inventory ${inventories[$i]}."
    fi
    log "Step: AWX bootstrap — creating job template ${templates[$i]}."
    awx -k job_templates create --wait \
      --name="${templates[$i]}" --project "${projects[$i]}" \
      --playbook "${playbooks[$i]}" --inventory "${inventories[$i]}" \
      --ask_variables_on_launch true \
      --ask_inventory_on_launch true \
      --ask_tags_on_launch true \
      -f human
  done
  log "Step: AWX bootstrap — finished."
}

log "Ansible prep — starting (AAP_NAMESPACE=${AAP_NAMESPACE}, AWX bootstrap=${BOOTSTRAP_AWX})."

if [[ -z "${ANSIBLE_URL:-}" || -z "${ANSIBLE_TOWER_PASSWORD:-}" ]]; then
  log "Credential source: cluster discovery (ANSIBLE_URL or ANSIBLE_TOWER_PASSWORD not fully set in env)."
  resolve_from_cluster
else
  log "Credential source: environment (ANSIBLE_URL and ANSIBLE_TOWER_PASSWORD set)."
  export ANSIBLE_URL
  export ANSIBLE_TOWER_PASSWORD
  if [[ -z "${ANSIBLE_TOKEN:-}" ]]; then
    log "ANSIBLE_TOKEN missing; minting from ANSIBLE_URL + ANSIBLE_TOWER_PASSWORD."
    if ! mint_token_from_password; then
      log "Unable to mint ANSIBLE_TOKEN from provided URL/password."
      exit 0
    fi
  else
    log "ANSIBLE_TOKEN already set; skipping mint."
  fi
fi

log "Checking critical variables…"
if [[ -z "${ANSIBLE_URL:-}" || -z "${ANSIBLE_TOWER_PASSWORD:-}" || -z "${ANSIBLE_TOKEN:-}" ]]; then
  log "Missing or invalid critical variables. Skipping script execution."
  [[ -z "${ANSIBLE_URL:-}" ]] && log " - ANSIBLE_URL is empty"
  [[ -z "${ANSIBLE_TOWER_PASSWORD:-}" ]] && log " - ANSIBLE_TOWER_PASSWORD is empty"
  [[ -z "${ANSIBLE_TOKEN:-}" ]] && log " - ANSIBLE_TOKEN is empty"
  exit 0
fi

log "Critical variables OK (controller URL, password, and token present — values not logged)."
ensure_ansible_secret

if is_truthy "${BOOTSTRAP_AWX}"; then
  bootstrap_awx_templates
else
  log "Skipping AWX bootstrap (E2E_ANSIBLE_AWX_BOOTSTRAP=${BOOTSTRAP_AWX})."
fi

# Playwright workers do not inherit env from this subprocess — persist resolved credentials for tests.
write_ansible_aap_context_file() {
  local dest="./ansible-aap.json"
  if ! command -v jq >/dev/null 2>&1; then
    log "jq not available; skipping write of ansible-aap.json for Playwright workers."
    return 0
  fi
  jq -n --arg url "${ANSIBLE_URL}" --arg token "${ANSIBLE_TOKEN}" \
    '{url: $url, token: $token}' >"${dest}"
  chmod 600 "${dest}" 2>/dev/null || true
  log "Wrote AAP credential context to ${dest} (read by @lib/app/auth/ansible-aap)."
}

write_ansible_aap_context_file

log "Ansible prep — done."
