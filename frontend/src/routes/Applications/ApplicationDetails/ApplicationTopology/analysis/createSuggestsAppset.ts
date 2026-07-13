/* Copyright Contributors to the Open Cluster Management project */
import type { TopologyNode } from '../types'
import type { IBulletDescription, IFilteredConditionError, TopologyAlert } from './analyzeTopology'
import { createTopologyErrorAlert, TopologyAlertActionType } from './utils'

export const createSuggestsAppset = (
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
      type: TopologyAlertActionType.launchArgo,
      action: { url: 'yahoo.com' },
    },
  ]
  createTopologyErrorAlert(suggestions, actions, alerts, filteredError)
}
