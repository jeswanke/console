/* Copyright Contributors to the Open Cluster Management project */
import jsYaml from 'js-yaml'
import stringSimilarity from 'string-similarity'
import type { ApplicationSet } from '~/resources'
import type { TopologyNode } from '../types'
import type { IFilteredConditionError, TopologyAlert } from './analyzeTopology'
import { createTopologyErrorAlert, TopologyAlertActionType } from './utils'

const APP_PATH_DOES_NOT_EXIST_MESSAGE =
  'Failed to load target state: failed to generate manifest for source: app path does not exist'
const FAILED_SYNC_MESSAGE =
  'Failed last sync attempt to []: one or more synchronization tasks completed unsuccessfully,  (retried 5 times).'
const SOURCE_REQUIRED_MESSAGE = 'either source.path, source.chart, or source.ref are required for source '
const SIMILARITY_THRESHOLD = 0.7

/** Collapses variable rpc / path details so app-path errors compare consistently. */
const normalizeAppPathDoesNotExistMessage = (message: string): string =>
  message
    .replace(
      /Failed to load target state: failed to generate manifest for source.*?app path does not exist/i,
      APP_PATH_DOES_NOT_EXIST_MESSAGE
    )
    .replace(/\s+/g, ' ')
    .trim()

const isAppPathDoesNotExistMessage = (message: string): boolean =>
  stringSimilarity.compareTwoStrings(
    normalizeAppPathDoesNotExistMessage(message),
    normalizeAppPathDoesNotExistMessage(APP_PATH_DOES_NOT_EXIST_MESSAGE)
  ) > SIMILARITY_THRESHOLD

/** Strips variable sync revision / reason so failed-sync messages compare consistently. */
const normalizeFailedSyncMessage = (message: string): string =>
  message
    .replace(/Failed last sync attempt to \[[^\]]*\]/i, 'Failed last sync attempt to []')
    .replace(/,\s*reason:.*?(?=\(retried)/i, ',  ')
    .replace(/\s+/g, ' ')
    .trim()

const isFailedSyncMessage = (message: string): boolean =>
  stringSimilarity.compareTwoStrings(
    normalizeFailedSyncMessage(message),
    normalizeFailedSyncMessage(FAILED_SYNC_MESSAGE)
  ) > SIMILARITY_THRESHOLD

/** Collapses variable source index so missing path/chart/ref errors compare consistently. */
const normalizeSourceRequiredMessage = (message: string): string =>
  message
    .replace(/either source\.path, source\.chart, or source\.ref are required for source.*/i, SOURCE_REQUIRED_MESSAGE)
    .replace(/\s+/g, ' ')
    .trim()

const isSourceRequiredMessage = (message: string): boolean =>
  stringSimilarity.compareTwoStrings(
    normalizeSourceRequiredMessage(message),
    normalizeSourceRequiredMessage(SOURCE_REQUIRED_MESSAGE)
  ) > SIMILARITY_THRESHOLD

export const createSuggestsApplication = (
  node: TopologyNode,
  filteredError: IFilteredConditionError,
  alerts: TopologyAlert[]
): void => {
  const applicationSet = node.specs.raw as ApplicationSet

  filteredError.errors.forEach((error) => {
    const message = error.firstError.message
    const singleError = { ...filteredError, errors: [error] }

    switch (true) {
      case isAppPathDoesNotExistMessage(message): {
        const currentYaml = jsYaml
          .dump(applicationSet.spec.template?.spec?.sources ?? applicationSet.spec.template?.spec?.source ?? {}, {
            indent: 2,
          })
          .split('\n')
        const suggestions = [
          { title: 'Check that the repository path exists for each source' },
          { title: 'Current sources', content: currentYaml },
        ]
        createTopologyErrorAlert(
          suggestions,
          [
            {
              label: 'Edit sources',
              type: TopologyAlertActionType.editYaml,
              node,
              highlightEditorPath: 'ApplicationSet.spec.template.spec.sources',
            },
          ],
          alerts,
          singleError
        )
        break
      }
      case isFailedSyncMessage(message): {
        const currentYaml = jsYaml
          .dump(applicationSet.spec.template?.spec?.sources ?? applicationSet.spec.template?.spec?.source ?? {}, {
            indent: 2,
          })
          .split('\n')
        const suggestions = [
          { title: 'Try syncing resources again' },
          { title: 'If the problem persists, check the application details in Argo CD' },
          { title: 'Current sources', content: currentYaml },
        ]
        createTopologyErrorAlert(
          suggestions,
          [
            {
              label: 'Sync resources',
              type: TopologyAlertActionType.syncResources,
              node,
            },
            {
              label: 'Edit sources',
              type: TopologyAlertActionType.editYaml,
              node,
              highlightEditorPath: 'ApplicationSet.spec.template.spec.sources',
            },
            {
              label: 'Launch Argo editor',
              type: TopologyAlertActionType.launchArgo,
              node,
            },
          ],
          alerts,
          singleError
        )
        break
      }
      case isSourceRequiredMessage(message): {
        const currentYaml = jsYaml
          .dump(applicationSet.spec.template?.spec?.sources ?? applicationSet.spec.template?.spec?.source ?? {}, {
            indent: 2,
          })
          .split('\n')
        const suggestions = [
          { title: 'Each source must specify path, chart, or ref' },
          { title: 'Current sources', content: currentYaml },
        ]
        createTopologyErrorAlert(
          suggestions,
          [
            {
              label: 'Edit sources',
              type: TopologyAlertActionType.editYaml,
              node,
              highlightEditorPath: 'ApplicationSet.spec.template.spec.sources',
            },
          ],
          alerts,
          singleError
        )
        break
      }
      default: {
        const currentYaml = jsYaml.dump(applicationSet.spec.template?.spec?.sources ?? {}, { indent: 2 }).split('\n')
        const suggestions = [{ title: 'Current sources', content: currentYaml }]
        createTopologyErrorAlert(
          suggestions,
          [
            {
              label: 'Edit sources',
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
          ],
          alerts,
          singleError
        )
      }
    }
  })
}
