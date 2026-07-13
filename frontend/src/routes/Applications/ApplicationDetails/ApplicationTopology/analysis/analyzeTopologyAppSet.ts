/* Copyright Contributors to the Open Cluster Management project */
import type { TopologyNode } from '../types'
import { analyzeTopologyApplications } from './analyzeTopologyApplications'
import type { IFilteredConditionError, IResourcesWithStatus, TopologyAlert } from './analyzeTopology'
import { createSuggestsAppset } from './createSuggestsAppset'
import { createSuggestsPlacement } from './createSuggestsPlacement'
import { extractConditionsErrors, setNodePulseForTypes } from './utils'

/**
 * Analyzes ApplicationSet topology nodes for placement and application errors.
 */
export const analyzeTopologyAppSet = async (
  appSet: TopologyNode,
  nodes: TopologyNode[],
  alerts: TopologyAlert[]
): Promise<void> => {
  let placementErrors: IFilteredConditionError[] = []
  let appsetErrors: IFilteredConditionError[] = []
  let appSetAppsErrors: IFilteredConditionError[] = []

  /////////////////////////////////////////////
  // Analyzing Placement Policy
  /////////////////////////////////////////////
  const placement = nodes.find((node) => node.type === 'placement')

  if (placement) {
    placementErrors = extractConditionsErrors([placement.placement as IResourcesWithStatus])
  }

  if (placementErrors.length > 0) {
    placementErrors.forEach((placementError) => {
      createSuggestsPlacement(placement!, placementError, alerts)
    })

    if (placement) {
      placement.specs.pulse = 'red'
    }
    setNodePulseForTypes(nodes, ['placementDecision', 'applicationset', 'cluster', 'git', 'chart'], 'none')
  }

  /////////////////////////////////////////////
  // Analyzing Application Set Applications
  /////////////////////////////////////////////
  if (placementErrors.length === 0) {
    appSetAppsErrors = await analyzeTopologyApplications(appSet, nodes, alerts)
  }

  /////////////////////////////////////////////
  // Analyzing Application Set
  /////////////////////////////////////////////
  if (placementErrors.length === 0 && appSetAppsErrors.length === 0) {
    appsetErrors = extractConditionsErrors([appSet.specs.raw as IResourcesWithStatus])

    if (appsetErrors.length > 0) {
      appsetErrors.forEach((appsetError) => {
        createSuggestsAppset(appSet, appsetError, alerts)
      })

      appSet.specs.pulse = 'red'
    }
  }
}
