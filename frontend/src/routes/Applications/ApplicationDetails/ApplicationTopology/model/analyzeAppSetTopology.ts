/* Copyright Contributors to the Open Cluster Management project */
import type { TopologyNode } from '../types'
import type { IConditionError, IResourcesWithStatus, TopologyAlert } from './analyzeTopology'
import { createTopologyAlert, extractConditionsErrors } from './analyzeTopologyHelpers'

/** Sets pulse color on all nodes matching the given types. */
const setNodePulseForTypes = (nodes: TopologyNode[], types: string[], pulse: string): void => {
  nodes.forEach((node) => {
    if (types.includes(node.type)) {
      node.specs.pulse = pulse
    }
  })
}

/**
 * Analyzes ApplicationSet topology nodes for placement and application errors.
 */
export const analyzeAppSetTopology = (appSet: TopologyNode, nodes: TopologyNode[], alerts: TopologyAlert[]): void => {
  let placementErrors: IConditionError[] = []
  let appsetErrors: IConditionError[] = []
  let appSetAppsErrors: IConditionError[] = []

  /////////////////////////////////////////////
  // Analyzing Placement Policy
  /////////////////////////////////////////////
  const placement = nodes.find((node) => node.type === 'placement')

  if (placement) {
    placementErrors = extractConditionsErrors([placement.placement as IResourcesWithStatus])
  }

  if (placementErrors.length > 0) {
    placementErrors.forEach((placementError) => {
      createTopologyAlert(placement!, alerts, placementError)
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
    const appSetApps = (appSet.specs.appSetApps ?? []) as IResourcesWithStatus[]
    appSetAppsErrors = extractConditionsErrors(appSetApps)

    if (appSetAppsErrors.length > 0) {
      appSetAppsErrors.forEach((appSetAppsError) => {
        createTopologyAlert(appSet, alerts, appSetAppsError, true)
      })

      appSet.specs.pulse = 'red'
    }
  }

  /////////////////////////////////////////////
  // Analyzing Application Set
  /////////////////////////////////////////////
  if (placementErrors.length === 0 && appSetAppsErrors.length === 0) {
    appsetErrors = extractConditionsErrors([appSet.specs.raw as IResourcesWithStatus])

    if (appsetErrors.length > 0) {
      appsetErrors.forEach((appsetError) => {
        createTopologyAlert(appSet, alerts, appsetError)
      })

      appSet.specs.pulse = 'red'
    }
  }
}
