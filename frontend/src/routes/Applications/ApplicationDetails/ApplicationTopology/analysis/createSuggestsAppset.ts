/* Copyright Contributors to the Open Cluster Management project */
import jsYaml from 'js-yaml'
import stringSimilarity from 'string-similarity'
import type { ApplicationSet } from '~/resources'
import type { TopologyNode } from '../types'
import type { IFilteredConditionError, TopologyAlert } from './analyzeTopology'
import { createTopologyErrorAlert, TopologyAlertActionType } from './utils'

const APPLICATION_GENERATION_FROM_PARAMS_REASON = 'ApplicationGenerationFromParamsError'
const NO_CLUSTER_DECISION_RESOURCES_MESSAGE = 'no clusterDecisionResources found'
const SIMILARITY_THRESHOLD = 0.7

const isNoClusterDecisionResourcesError = (reason: string, message: string): boolean =>
  reason === APPLICATION_GENERATION_FROM_PARAMS_REASON &&
  stringSimilarity.compareTwoStrings(message, NO_CLUSTER_DECISION_RESOURCES_MESSAGE) > SIMILARITY_THRESHOLD

export const createSuggestsAppset = (
  node: TopologyNode,
  filteredError: IFilteredConditionError,
  alerts: TopologyAlert[]
): void => {
  const applicationSet = node.specs.raw as ApplicationSet

  filteredError.errors.forEach((error) => {
    const { message, reason } = error.firstError
    const singleError = { ...filteredError, errors: [error] }

    switch (true) {
      case isNoClusterDecisionResourcesError(reason, message): {
        const currentYaml = jsYaml.dump(applicationSet.spec.generators ?? {}, { indent: 2 }).split('\n')
        const suggestions = [
          {
            title:
              'Make sure the placement referenced in the ApplicationSet generator exists and has cluster decisions',
          },
          { title: 'Current generators', content: currentYaml },
        ]
        createTopologyErrorAlert(
          suggestions,
          [
            {
              label: 'Edit generators',
              type: TopologyAlertActionType.editYaml,
              node,
              highlightEditorPath: 'ApplicationSet.spec.generators',
            },
            {
              label: 'Edit destinations',
              type: TopologyAlertActionType.editYaml,
              node,
              highlightEditorPath: 'ApplicationSet.spec.template.spec.destination',
            },
          ],
          alerts,
          singleError
        )
        break
      }
      default: {
        const currentYaml = jsYaml
          .dump(applicationSet.spec.template?.spec?.destination ?? {}, { indent: 2 })
          .split('\n')
        const suggestions = [{ title: 'Current destinations', content: currentYaml }]
        createTopologyErrorAlert(
          suggestions,
          [
            {
              label: 'Edit destinations',
              type: TopologyAlertActionType.editYaml,
              node,
              highlightEditorPath: 'ApplicationSet.spec.template.spec.destination',
            },
          ],
          alerts,
          singleError
        )
      }
    }
  })
}
