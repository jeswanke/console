/* Copyright Contributors to the Open Cluster Management project */
import type { TFunction } from 'i18next'
import type { TopologyNode } from '../types'
import type { RepositoryError } from './analyzeTopologyRepository'
import { createTopologyAlert, type IBulletDescription, type TopologyAlert } from './utils'

const MAX_REPOSITORY_ALERT_ENTRIES = 5

interface RepositoryAnalysisResult {
  repository: TopologyNode
  errors: RepositoryError[]
}

export function createSuggestsRepository(
  results: RepositoryAnalysisResult[],
  alerts: TopologyAlert[],
  t: TFunction
): void {
  const errorsByFile = new Map<string, RepositoryAnalysisResult>()
  results.forEach(({ repository, errors }) => {
    errors.forEach((error) => {
      const key = JSON.stringify([repository.id ?? repository.name, repository.namespace, error.sourceId, error.path])
      const group = errorsByFile.get(key)
      if (group) {
        group.errors.push(error)
      } else {
        errorsByFile.set(key, { repository, errors: [error] })
      }
    })
  })
  if (errorsByFile.size === 0) return

  const suggestions: Record<RepositoryError['type'], string> = {
    load: t('Verify repository access, URL, revision, and path. Repository browsing supports GitHub repositories.'),
    empty: t('Add files to the configured repository path or select a different path or revision.'),
    syntax: t('Correct the YAML syntax at the indicated line before checking resource values.'),
    port: t('Set port fields to integers between 0 and 32767.'),
    ansibleSecret: t(
      'Create or correct the referenced Ansible credential in the job namespace, including host and token.'
    ),
    ansibleConnection: t('Check Ansible server availability and the credential host, token, and permissions.'),
    ansibleTemplate: t('Set spec.job_template_name to an existing job template on the referenced Ansible server.'),
  }
  const bullets: IBulletDescription[] = [...errorsByFile.values()]
    .slice(0, MAX_REPOSITORY_ALERT_ENTRIES)
    .map(({ repository, errors }) => {
      const firstError = errors[0]
      const lines = [...new Set(errors.flatMap((error) => (error.line === undefined ? [] : [error.line])))].sort(
        (a, b) => a - b
      )
      let location = firstError.path || repository.name || firstError.sourceId
      if (firstError.path && lines.length > 0) {
        location =
          lines.length === 1
            ? t('{{file}}, line {{line}}', { file: firstError.path, line: lines[0] })
            : t('{{file}}, lines {{lines}}', { file: firstError.path, lines: lines.join(', ') })
      }
      return {
        title: t('{{location}}:', { location }),
        description: t('{{message}} {{suggestion}}', {
          message: [...new Set(errors.map((error) => error.message))].join(' '),
          suggestion: [...new Set(errors.map((error) => suggestions[error.type]))].join(' '),
        }),
      }
    })
  if (errorsByFile.size > MAX_REPOSITORY_ALERT_ENTRIES) bullets.push({ title: t('And more...') })

  const alert = createTopologyAlert(t('Repository errors'), 'red', {
    message: t('Review the repository errors below.'),
    bullets,
  })
  if (!alerts.some((existing) => existing.id === alert.id)) alerts.push(alert)
}
