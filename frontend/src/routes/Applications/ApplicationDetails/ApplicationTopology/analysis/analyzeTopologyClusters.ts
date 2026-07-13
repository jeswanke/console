/* Copyright Contributors to the Open Cluster Management project */
import { GitOpsClusterApiVersion, GitOpsClusterKind } from '~/resources/gitops-cluster'
import { getResource } from '~/resources/utils'
import { fleetResourceRequest } from '../../../../../resources/utils/fleet-resource-request'
import type { AppSetCluster, TopologyNode } from '../types'
import type { IResourcesWithStatus, TopologyAlert } from './analyzeTopology'
import { createSuggestsAppset } from './createSuggestsAppset'
import { createTopologyAlert, extractConditionsErrors } from './utils'

const MAX_PULL_CLUSTER_FETCHES = 3
const GITOPS_CLUSTER_NAME = 'gitops'
const GITOPS_NAMESPACE = 'openshift-gitops'
const GITOPS_OPERATOR_SUBSCRIPTION = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'Subscription',
  name: 'openshift-gitops-operator',
  namespace: 'openshift-gitops-operator',
}

const fetchHubGitOpsCluster = async (): Promise<IResourcesWithStatus | undefined> => {
  try {
    return (await getResource({
      apiVersion: GitOpsClusterApiVersion,
      kind: GitOpsClusterKind,
      metadata: { name: GITOPS_CLUSTER_NAME, namespace: GITOPS_NAMESPACE },
    }).promise) as IResourcesWithStatus
  } catch {
    return undefined
  }
}

const verifyPullClusterGitOps = async (
  appSet: TopologyNode,
  appSetClusters: string[],
  alerts: TopologyAlert[]
): Promise<void> => {
  const clustersToVerify = appSetClusters.slice(0, MAX_PULL_CLUSTER_FETCHES)
  await Promise.all(
    clustersToVerify.map(async (clusterName) => {
      try {
        const response = await fleetResourceRequest('GET', clusterName, GITOPS_OPERATOR_SUBSCRIPTION)
        if ('errorMessage' in response) {
          const alert = createTopologyAlert('OpenShift GitOps Missing', 'red', {
            message: `Cannot find OpenShift GitOps Operator on ${clusterName}`,
            bullets: [
              {
                title: `For pulled applications, make sure the OpenShift GitOps Operator is installed on ${clusterName}`,
                content: [],
              },
            ],
          })
          if (!alerts.some((existingAlert) => existingAlert.id === alert.id)) {
            alerts.push(alert)
          }
          appSet.specs.pulse = 'red'
        }
      } catch {
        // Ignore unreachable clusters during operator verification.
      }
    })
  )
}

/**
 * Analyzes cluster topology nodes for GitOpsCluster condition errors.
 */
export const analyzeTopologyClusters = async (
  appSet: TopologyNode,
  nodes: TopologyNode[],
  alerts: TopologyAlert[]
): Promise<void> => {
  const isAppSetPullModel = Boolean(appSet.specs.isAppSetPullModel)
  const appSetClusters = ((appSet.specs.appSetClusters ?? []) as AppSetCluster[]).map((cluster) => cluster.name)

  if (isAppSetPullModel) {
    await verifyPullClusterGitOps(appSet, appSetClusters, alerts)
  }

  const hubGitOpsCluster = await fetchHubGitOpsCluster()
  if (!hubGitOpsCluster) {
    return
  }

  const gitopsErrors = extractConditionsErrors([hubGitOpsCluster])

  if (gitopsErrors.length > 0) {
    gitopsErrors.forEach((appsetError) => {
      createSuggestsAppset(appSet, appsetError, alerts)
    })

    const cluster = nodes.find((node) => node.type === 'cluster')
    if (cluster) {
      cluster.specs.pulse = 'red'
    }
  }
}
