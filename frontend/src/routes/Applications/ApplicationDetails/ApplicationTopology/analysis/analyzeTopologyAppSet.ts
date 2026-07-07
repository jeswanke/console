/* Copyright Contributors to the Open Cluster Management project */
import jsYaml from 'js-yaml'
import type { ApplicationSet, Placement } from '~/resources'
import type { TopologyNode } from '../types'
import type {
  IBulletDescription,
  IFilteredConditionError,
  IResourcesWithStatus,
  TopologyAlert,
} from './analyzeTopology'
import { createTopologyAlert, extractConditionsErrors, setNodePulseForTypes } from './utils'

/**
 * Analyzes ApplicationSet topology nodes for placement and application errors.
 */
export const analyzeTopologyAppSet = (appSet: TopologyNode, nodes: TopologyNode[], alerts: TopologyAlert[]): void => {
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
      addPlacementAnalysis(placement!, placementError, alerts)
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
        addApplicationAnalysis(appSet, appSetAppsError, alerts)
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
        addAppSetAnalysis(appSet, appsetError, alerts)
      })

      appSet.specs.pulse = 'red'
    }
  }
}

const addAppSetAnalysis = (
  node: TopologyNode,
  filteredError: IFilteredConditionError,
  alerts: TopologyAlert[]
): void => {
  void node
  const suggestions: IBulletDescription[] = [
    { title: 'tip 1', content: ['line1', 'line2'] },
    { title: 'tip 2', content: ['line1', 'line2'] },
    { title: 'tip 3', content: ['line1', 'line2'] },
  ]
  const actions = [
    {
      label: 'Launch Argo editor',
      action: { url: 'yahoo.com' },
    },
  ]
  createTopologyAlert(suggestions, actions, alerts, filteredError)
}

const addPlacementAnalysis = (
  node: TopologyNode,
  filteredError: IFilteredConditionError,
  alerts: TopologyAlert[]
): void => {
  const placement = node.placement as Placement
  const currentYaml = jsYaml.dump(placement.spec.predicates ?? {}, { indent: 2 }).split('\n')
  const suggestions: IBulletDescription[] = [{ title: 'Current specification', content: currentYaml }]

  const actions = [
    {
      label: 'Edit specification',
      action: { url: 'yahoo.com' },
    },
  ]
  createTopologyAlert(suggestions, actions, alerts, filteredError)
}

const addApplicationAnalysis = (
  node: TopologyNode,
  filteredError: IFilteredConditionError,
  alerts: TopologyAlert[]
): void => {
  const applicationSet = node.specs.raw as ApplicationSet
  const currentYaml = jsYaml.dump(applicationSet.spec.template?.spec?.sources ?? {}, { indent: 2 }).split('\n')
  const suggestions: IBulletDescription[] = [{ title: 'Current specification', content: currentYaml }]

  const actions = [
    {
      label: 'Edit specification',
      action: { url: 'yahoo.com' },
    },
    {
      label: 'Edit YAML',
      node,
    },
    ...(node.type === 'pod'
      ? [
          {
            label: 'Show logs',
            node,
          },
        ]
      : []),
  ]
  createTopologyAlert(suggestions, actions, alerts, filteredError)
}
