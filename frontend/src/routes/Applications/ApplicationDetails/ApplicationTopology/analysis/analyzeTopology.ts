/* Copyright Contributors to the Open Cluster Management project */
import type { TopologyNode } from '../types'
import { analyzeTopologyAppSet } from './analyzeTopologyAppSet'
import { analyzeTopologyClusters } from './analyzeTopologyClusters'
import { analyzeTopologyDeployments } from './analyzeTopologyDeployments'
import type { TopologyAlert } from './utils'

export type {
  IBulletDescription,
  IConditionWithErrors,
  IConditionError,
  IFilteredConditionError,
  IResourcesWithStatus,
  TopologyAlert,
  TopologyAlertAction,
  TopologyAlertDescription,
} from './utils'

export { createTopologyAlert, extractConditionsErrors, TopologyAlertActionType } from './utils'

/**
 * Analyzes topology nodes and produces alerts for placement, cluster, and deployment issues.
 */
export const analyzeTopology = (nodes: TopologyNode[]): TopologyAlert[] => {
  const alerts: TopologyAlert[] = []

  const appSet = nodes.find((node) => node.type === 'applicationset')

  if (appSet && !appSet.specs?.isCreating) {
    analyzeTopologyAppSet(appSet, nodes, alerts)
  }

  analyzeTopologyClusters(nodes, alerts)
  analyzeTopologyDeployments(nodes, alerts)

  return alerts
}
