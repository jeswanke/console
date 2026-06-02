#!/usr/bin/env bash
#
# Ported from application-ui-test: tests/cypress/scripts/mc_kubeconfigs/setup-cluster-contexts.sh
#
# Builds MC_MERGED_kubeconfig in the **current directory** (use cwd=.auth/ from globalSetup).
# Each spoke context is renamed to the ManagedCluster name so `oc config use-context <mc>` works
# (same contract as Cypress managedOcLogin).
#
# Requires: oc, jq, yq. Run while logged into the hub (same as generate-managed-cluster-data.py).
#
# Hub context in the merged file is renamed to "local-cluster" (upstream behavior).

set -euo pipefail
shopt -s nullglob

MC_WHITELIST="local-cluster"
AUTO_IMPORT_SECRET="auto-import-secret"
ACM_HUB_CONTEXT="local-cluster"
MERGED_KUBECONFIG="MC_MERGED_kubeconfig"

save_kubeconfig() {
  local cluster_name=$1
  local cluster_namespace=$2
  local secret_name=$3

  if ! oc get secret "$secret_name" -n "$cluster_namespace" &>/dev/null; then
    echo "No matching secret called $secret_name found for cluster $cluster_name"
    return
  fi

  echo "Found secret: $secret_name in namespace $cluster_namespace"

  TEMP_KUBECONFIG=$(mktemp)

  oc get secret "$secret_name" -n "$cluster_namespace" -o jsonpath='{.data.kubeconfig}' | base64 --decode >"$TEMP_KUBECONFIG"

  oc --kubeconfig="$TEMP_KUBECONFIG" config rename-context "$(oc --kubeconfig="$TEMP_KUBECONFIG" config current-context)" "$cluster_name"

  yq eval -i "
            with (.users[]; .name = \"$cluster_name\")
            | with (.contexts[]; .context.user = \"$cluster_name\")
        " "$TEMP_KUBECONFIG"

  if [ $? -ne 0 ]; then
    echo "yq: failed to update the users and contexts sections in the kubeconfig file"
    exit 1
  fi

  FINAL_KUBECONFIG_FILE="${cluster_name}_kubeconfig"
  mv "$TEMP_KUBECONFIG" "$FINAL_KUBECONFIG_FILE"

  echo "Kubeconfig for $cluster_name saved to $FINAL_KUBECONFIG_FILE"
  echo "Context cluster info for this cluster:"
  oc --kubeconfig="$FINAL_KUBECONFIG_FILE" cluster-info
  oc --kubeconfig="$FINAL_KUBECONFIG_FILE" whoami --show-server
}
echo "=============================================================="
echo "Clean up any previous kubeconfigs in the workspace..."
rm -f ./*_kubeconfig
echo "=============================================================="
echo "Save the current ACM hub kubeconfig and change its context name..."
TEMP_KUBECONFIG=$(mktemp)

oc config view --minify --flatten --raw >"$TEMP_KUBECONFIG"
oc --kubeconfig="$TEMP_KUBECONFIG" config rename-context "$(oc --kubeconfig="$TEMP_KUBECONFIG" config current-context)" "$ACM_HUB_CONTEXT"
oc --kubeconfig="$TEMP_KUBECONFIG" config view --raw >"${ACM_HUB_CONTEXT}_kubeconfig"
rm "$TEMP_KUBECONFIG"
echo "Context cluster info for this cluster:"
oc --kubeconfig="${ACM_HUB_CONTEXT}_kubeconfig" cluster-info
oc --kubeconfig="${ACM_HUB_CONTEXT}_kubeconfig" whoami
echo "=============================================================="

MANAGED_CLUSTERS=$(oc get managedclusters --selector "name notin(${MC_WHITELIST})" -o json | jq -r '.items[] | select(
     (.status.conditions[] | select(.type == "ManagedClusterJoined" and .status == "True")) and
     (.status.conditions[] | select(.type == "ManagedClusterConditionAvailable" and .status == "True"))
 )')

HIVE_CLUSTERS=$(echo "$MANAGED_CLUSTERS" | jq -r '
    . | select(
        .metadata.annotations["open-cluster-management/created-via"] == "hive"
    ) | .metadata.name
')

echo HIVE_CLUSTERS: "$HIVE_CLUSTERS"

echo "=============================================================="
if [ -z "$HIVE_CLUSTERS" ]; then
  echo "No hive managed clusters found! Skipping..."
else
  echo "Retrieving kubeconfig for hive managed clusters:"
  echo "$HIVE_CLUSTERS"
  echo "=============================================================="

  for hive_cluster in $HIVE_CLUSTERS; do
    SECRET_NAME=$(oc get secrets -n "$hive_cluster" -o json | jq -r --arg cluster "$hive_cluster" '
            .items[] | select(.metadata.name | startswith($cluster + "-") and endswith("-admin-kubeconfig")) | .metadata.name
            ' | head -n 1)

    if [ -z "$SECRET_NAME" ]; then
      echo "No matching secret found for cluster $hive_cluster"
      continue
    fi

    save_kubeconfig "$hive_cluster" "$hive_cluster" "$SECRET_NAME"

    echo "=============================================================="
  done
fi

HCP_CLUSTERS=$(echo "$MANAGED_CLUSTERS" | jq -r '
    . | select(
        .metadata.annotations["open-cluster-management/created-via"] == "hypershift"
    ) | .metadata.name
')
echo HCP_CLUSTERS: "$HCP_CLUSTERS"
echo "=============================================================="
if [ -z "$HCP_CLUSTERS" ]; then
  echo "No hypershift managed clusters in this branch (ok)."
else
  for hcp_cluster in $HCP_CLUSTERS; do
    echo "Retrieving kubeconfig for hypershift managed cluster $hcp_cluster..."
    HCP_SECRET=${hcp_cluster}-admin-kubeconfig

    if ! oc get secret "$HCP_SECRET" -n "local-cluster" &>/dev/null; then
      echo "No matching secret called $HCP_SECRET found for cluster $hcp_cluster"
      continue
    fi

    save_kubeconfig "$hcp_cluster" "local-cluster" "$HCP_SECRET"
    echo "=============================================================="
  done
fi

OTHER_CLUSTERS=$(echo "$MANAGED_CLUSTERS" | jq -r --arg HIVE_CLUSTERS "$HIVE_CLUSTERS" --arg HCP_CLUSTERS "$HCP_CLUSTERS" '
    .metadata.name as $name |
    ($HIVE_CLUSTERS | split(" ")) as $hive |
    ($HCP_CLUSTERS | split(" ")) as $hcp |
    select(
        ($hive | index($name) | not) and
        ($hcp | index($name) | not)
    ) | $name
')

echo OTHER_CLUSTERS: "$OTHER_CLUSTERS"
echo "=============================================================="
if [ -z "$OTHER_CLUSTERS" ]; then
  echo "No other imported managed clusters in this branch (ok)."
else
  for other_cluster in $OTHER_CLUSTERS; do
    echo "Retrieving kubeconfig for imported managed cluster $other_cluster..."
    if ! oc get secret "$AUTO_IMPORT_SECRET" -n "$other_cluster" &>/dev/null; then
      echo "No matching secret called $AUTO_IMPORT_SECRET found for cluster $other_cluster"
      continue
    fi

    save_kubeconfig "$other_cluster" "$other_cluster" "$AUTO_IMPORT_SECRET"
    echo "=============================================================="
  done
fi
echo "All kubeconfigs have been saved for managed clusters!"
echo "=============================================================="
echo "Merging all kubeconfigs..."
: >"$MERGED_KUBECONFIG"

export KUBECONFIG=""
for kubeconfig in ./*_kubeconfig; do
  [ -e "$kubeconfig" ] || continue
  if [ -z "$KUBECONFIG" ]; then
    export KUBECONFIG="$kubeconfig"
  else
    export KUBECONFIG="$KUBECONFIG:$kubeconfig"
  fi
done

oc config view --raw >"$MERGED_KUBECONFIG"
echo "Merged kubeconfig saved to $MERGED_KUBECONFIG"

echo "=============================================================="
echo "Verifying connectivity to each managed cluster context..."
echo

export KUBECONFIG="$MERGED_KUBECONFIG"
MC_NAMES=$(echo "$MANAGED_CLUSTERS" | jq -r '.metadata.name')

echo
oc config get-contexts
echo

for mc in $MC_NAMES; do
  echo "Try logging into managed cluster: $mc"

  oc config use-context "$mc"
  oc cluster-info
  if [ $? -ne 0 ]; then
    echo "Failed to reach managed cluster: $mc"
    exit 1
  fi
  echo "=============================================================="
done

oc config use-context "$ACM_HUB_CONTEXT"
oc cluster-info
