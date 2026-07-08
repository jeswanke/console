/* Copyright Contributors to the Open Cluster Management project */
import jsYaml from 'js-yaml'
import type { Placement } from '~/resources'
import type { TopologyNode } from '../types'
import type { IBulletDescription, IFilteredConditionError, TopologyAlert } from './analyzeTopology'
import { createTopologyAlert, TopologyAlertActionType } from './utils'

export const createAlertsPlacement = (
  node: TopologyNode,
  filteredError: IFilteredConditionError,
  alerts: TopologyAlert[]
): void => {
  const placement = node.placement as Placement
  const currentYaml = jsYaml.dump(placement.spec.clusterSets ?? {}, { indent: 2 }).split('\n')
  const suggestions: IBulletDescription[] = [{ title: 'Current specification', content: currentYaml }]

  const actions = [
    {
      label: 'Edit specification',
      type: TopologyAlertActionType.editYaml,
      node,
      highlightEditorPath: 'Placement.spec.clusterSets',
    },
  ]
  createTopologyAlert(suggestions, actions, alerts, filteredError)
}
