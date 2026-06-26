/* eslint-disable prettier/prettier */
/* Copyright Contributors to the Open Cluster Management project */
import type { TopologyNode } from '../types'
import { analyzeAppSetTopology } from './analyzeAppSetTopology'
import type { TopologyAlert, TopologyAlertAction } from './analyzeTopologyHelpers'

export type {
  IConditionError,
  IConditionErrors,
  IResourcesWithStatus,
  TopologyAlert,
  TopologyAlertAction,
  TopologyAlertDescription,
} from './analyzeTopologyHelpers'

export { createTopologyAlert, extractConditionsErrors } from './analyzeTopologyHelpers'

/**
 * Analyzes topology nodes and produces alerts for placement, cluster, and deployment issues.
 */
export const analyzeTopology = (nodes: TopologyNode[]): TopologyAlert[] => {
  const alerts: TopologyAlert[] = []

  const appSet = nodes.find((node) => node.type === 'applicationset')

  if (appSet && !appSet.specs?.isCreating) {
    analyzeAppSetTopology(appSet, nodes, alerts)
  }

  analyzeClusters(nodes)
  analyzeDeployments(nodes)

  return alerts
}

/** Placeholder for future cluster-level topology alert analysis. */
export const analyzeClusters = (nodes: TopologyNode[]): void => {
  void nodes
}

/** Placeholder for future deployment-level topology alert analysis. */
export const analyzeDeployments = (nodes: TopologyNode[]): void => {
  void nodes
}

/** Builds tip bullets from an error message for alert descriptions. */
export const createTopologyAlertTips = (message: string): string[] => {
  const tips: string[] = []
  if (message?.toLowerCase().includes('predicate')) {
    tips.push('Fix destination')
  }
  return tips
}

/** Returns action links for a topology alert based on the related node. */
export const getTopologyActions = (node: TopologyNode): TopologyAlertAction[] => {
  const editYamlAction: TopologyAlertAction = {
    label: 'Edit YAML',
    action: { url: 'yahoo.com' },
  }

  if (node.type === 'placement') {
    return [editYamlAction]
  }

  if (node.type === 'applicationset') {
    return [
      {
        label: 'Launch Argo editor',
        action: { url: 'yahoo.com' },
      },
      editYamlAction,
    ]
  }

  return []
}
