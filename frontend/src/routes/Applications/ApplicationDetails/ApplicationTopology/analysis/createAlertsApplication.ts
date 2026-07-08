/* Copyright Contributors to the Open Cluster Management project */
import jsYaml from 'js-yaml'
import type { ApplicationSet } from '~/resources'
import type { TopologyNode } from '../types'
import type { IBulletDescription, IFilteredConditionError, TopologyAlert } from './analyzeTopology'
import { createTopologyAlert, TopologyAlertActionType } from './utils'

export const createAlertsApplication = (
  node: TopologyNode,
  filteredError: IFilteredConditionError,
  alerts: TopologyAlert[]
): void => {
  const applicationSet = node.specs.raw as ApplicationSet
  const currentYaml = jsYaml.dump(applicationSet.spec.template?.spec?.sources ?? {}, { indent: 2 }).split('\n')
  const suggestions: IBulletDescription[] = [{ title: 'Current specification', content: currentYaml }]

  const actions = [
    {
      label: 'Edit YAML',
      type: TopologyAlertActionType.editYaml,
      node,
      highlightEditorPath: 'ApplicationSet.spec.template.spec.sources',
    },
    ...(node.type === 'pod'
      ? [
          {
            label: 'Show logs',
            type: TopologyAlertActionType.showLog,
            node,
          },
        ]
      : []),
  ]
  createTopologyAlert(suggestions, actions, alerts, filteredError)
}
