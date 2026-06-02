#!/usr/bin/env bash
# Ported from application-ui-test (Cypress). Paths are relative to this script.
set -euo pipefail

echo "e2e TEST - ArgoCD integration"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
T="$SCRIPT_DIR/templates/argocd_yaml"
OPENSHIFT_GITOPS_SUB="$T/openshift-gitops-sub.yaml"
GITOPS_OPERATOR_GROUP="$T/gitops-operator-group.yaml"
ARGOCD_RESOURCE_PATH="$T/argocd-resource.yaml"
MANAGEDCLUSTERSET_PATH="$T/managedclusterset.yaml"
MANAGEDCLUSTERSETBINDING_PATH="$T/managedclustersetbinding.yaml"
PLACEMENT_PATH="$T/placement.yaml"
GITOPSCLUSTER="$T/gitopscluster.yaml"

KUBECTL_HUB="oc"
SKIP_INSTALL=${1:-}

waitForRes() {
  FOUND=1
  MINUTE=0
  resKinds=$1
  resName=$2
  resNamespace=$3
  ignore=$4
  running="\([0-9]\+\)\/\1"
  printf "\n#####\nWait for %s/%s to reach running state (4min).\n" "${resNamespace}" "${resName}"
  while [ ${FOUND} -eq 1 ]; do
    if [ $MINUTE -gt 240 ]; then
      echo "Timeout waiting for the ${resNamespace}/${resName}."
      echo "List of current resources:"
      oc -n "${resNamespace}" get "${resKinds}"
      echo "You should see ${resNamespace}/${resName} ${resKinds}"
      if [ "${resKinds}" == "pods" ]; then
        oc -n "${resNamespace}" describe deployments "${resName}"
      fi
      exit 1
    fi
    if [ "$ignore" == "" ]; then
      echo "oc -n ${resNamespace} get ${resKinds} | grep ${resName}"
      operatorRes=$(oc -n "${resNamespace}" get "${resKinds}" | grep "${resName}" || true)
    else
      operatorRes=$(oc -n "${resNamespace}" get "${resKinds}" | grep "${resName}" | grep -v "${ignore}" || true)
    fi
    if echo "$operatorRes" | grep -q "${running}"; then
      echo "* ${resName} is running"
      break
    elif [ -n "${operatorRes}" ] && [ "${resKinds}" == "deployments" ]; then
      echo "* ${resKinds} created: ${operatorRes}"
      break
    elif [ "$operatorRes" == "" ]; then
      operatorRes="Waiting"
    fi
    echo "* STATUS: $operatorRes"
    sleep 3
    MINUTE=$((MINUTE + 3))
  done
}

verifySecretAdded() {
  managedCluster=$1
  namespace=$2
  MINUTE=0
  while true; do
    if [ $MINUTE -gt 120 ]; then
      echo "$(date) Timeout waiting for the managed cluster secret ${managedCluster}-application-manager-cluster-secret to be added into ${namespace}"
      echo "E2E CANARY TEST - EXIT WITH ERROR"
      exit 1
    fi
    if $KUBECTL_HUB get secret "${managedCluster}-application-manager-cluster-secret" -n "${namespace}"; then
      break
    fi
    echo "$(date) waiting for the managed cluster secret ${managedCluster}-application-manager-cluster-secret to be added into ${namespace}"
    sleep 10
    MINUTE=$((MINUTE + 10))
  done
}

echo "==== Validating hub and spoke cluster access ===="
$KUBECTL_HUB cluster-info
if [ $? -ne 0 ]; then
  echo "hub cluster Not accessed."
  exit 1
fi
if [[ "${SKIP_INSTALL}" != "skip-install" ]]; then
  echo "==== Create ns for Openshift GitOps operator ===="
  $KUBECTL_HUB create ns openshift-gitops-operator 2>/dev/null || true
  echo "==== Apply the OperatorGroup to the cluster ===="
  $KUBECTL_HUB apply -f "$GITOPS_OPERATOR_GROUP"
  echo "==== Installing Openshift GitOps operator and ArgoCd server ===="
  $KUBECTL_HUB apply -f "$OPENSHIFT_GITOPS_SUB"
  waitForRes "pods" "gitops-operator" "openshift-gitops-operator" ""

  waitForRes "pods" "openshift-gitops-server" "openshift-gitops" ""
  waitForRes "pods" "openshift-gitops-repo-server" "openshift-gitops" ""
  waitForRes "pods" "openshift-gitops-dex-server" "openshift-gitops" ""
  waitForRes "pods" "openshift-gitops-redis" "openshift-gitops" ""
  waitForRes "pods" "openshift-gitops-applicationset-controller" "openshift-gitops" ""
  waitForRes "pods" "openshift-gitops-application-controller" "openshift-gitops" ""
fi

$KUBECTL_HUB apply -f "$MANAGEDCLUSTERSET_PATH"
echo "$(date) managedclusterset created"

MANAGED_CLUSTERS=( $($KUBECTL_HUB get managedclusters -l local-cluster=true -o name | awk -F/ '{print $2}') )
echo "Added local cluster to managedclusterset auto-gitops-cluster-set"

for element in "${MANAGED_CLUSTERS[@]}"; do
  echo "$(date) Adding ${element} to managed cluster set auto-gitops-cluster-set"
  $KUBECTL_HUB label --overwrite managedclusters "${element}" cluster.open-cluster-management.io/clusterset=auto-gitops-cluster-set
done

$KUBECTL_HUB apply -f "$MANAGEDCLUSTERSETBINDING_PATH"
echo "$(date) managedclustersetbinding created"

$KUBECTL_HUB apply -f "$PLACEMENT_PATH"
echo "$(date) placement created"

$KUBECTL_HUB delete -f "$GITOPSCLUSTER" 2>/dev/null || true
$KUBECTL_HUB apply -f "$GITOPSCLUSTER"
echo "$(date) gitopscluster created"

echo "$(date)  ====  verify that the managed cluster secrets are added into the first argocd instance"
for element in "${MANAGED_CLUSTERS[@]}"; do
  verifySecretAdded "${element}" "openshift-gitops"
done

exit 0
