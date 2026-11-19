/* Copyright Contributors to the Open Cluster Management project */
import type { TFunction } from 'i18next'
import YAML from 'yaml'
import { Node, Scalar, YAMLMap, YAMLSeq } from 'yaml/types'
import { maskYamlTemplates } from '~/lib/yamlTemplates'
import { getGitBlobContents, getSecret, type ApplicationSet, type Secret } from '~/resources'
import { listAnsibleTowerJobs } from '~/resources/utils/resource-request'
import { loadRepositorySource, REPOSITORY_YAML_MAX_FILES } from '~/resources/repositoryUtils'
import {
  buildRepositorySources,
  countGitBranchPathFiles,
  findRepositorySecretAccess,
  getRepositorySourceGroupId,
} from '../helpers/repositoryNavigatorHelpers'
import type { TopologyNode } from '../types'

export interface RepositoryError {
  type: 'load' | 'empty' | 'syntax' | 'port' | 'ansibleSecret' | 'ansibleConnection' | 'ansibleTemplate'
  message: string
  sourceId: string
  fileId?: string
  path?: string
  line?: number
}

type AnsibleConnection = { templates: string[] } | { type: 'ansibleSecret' | 'ansibleConnection'; message: string }

async function checkAnsibleConnection(name: string, namespace: string, t: TFunction): Promise<AnsibleConnection> {
  let secret: Secret
  try {
    secret = await getSecret({ name, namespace }).promise
  } catch {
    return {
      type: 'ansibleSecret',
      message: t('Cannot read Ansible credential {{namespace}}/{{name}}.', { namespace, name }),
    }
  }
  if (!secret.data?.host || !secret.data?.token) {
    return { type: 'ansibleSecret', message: t('Ansible credential {{name}} must contain host and token.', { name }) }
  }
  try {
    const jobs = await listAnsibleTowerJobs({ name, namespace }).promise
    return { templates: jobs.results.filter((job) => job.type === 'job_template').map((job) => job.name) }
  } catch {
    return {
      type: 'ansibleConnection',
      message: t(
        'Cannot connect to the Ansible server using {{namespace}}/{{name}}. Check the server and credentials.',
        { namespace, name }
      ),
    }
  }
}

async function analyzeFile(
  contents: string,
  file: { fileId: string; path: string; sourceId: string },
  defaultNamespace: string,
  connections: Map<string, Promise<AnsibleConnection>>,
  t: TFunction
): Promise<RepositoryError[]> {
  const errors: RepositoryError[] = []
  const documents = YAML.parseAllDocuments(maskYamlTemplates(contents), { prettyErrors: true })
  for (const document of documents) {
    for (const error of document.errors) {
      errors.push({ ...file, type: 'syntax', message: error.message, line: error.linePos?.start.line ?? 1 })
    }
  }
  if (errors.length) return errors

  const isTemplated = (node: unknown): boolean =>
    node instanceof Node && !!node.range && contents.slice(node.range[0], node.range[1]).includes('{{')
  const lineOf = (node: unknown): number =>
    node instanceof Node && node.range ? contents.slice(0, node.range[0]).split('\n').length : 1
  const addError = (type: RepositoryError['type'], message: string, node: unknown) => {
    errors.push({ ...file, type, message, line: lineOf(node) })
  }
  const jobs: YAMLMap[] = []
  const visit = (node: unknown) => {
    if (node instanceof YAMLMap) {
      if (node.get('kind') === 'AnsibleJob') jobs.push(node)
      for (const pair of node.items) {
        const key: unknown = pair.key
        const value: unknown = pair.value
        if (
          key instanceof Scalar &&
          typeof key.value === 'string' &&
          key.value.toLowerCase().includes('port') &&
          !isTemplated(key) &&
          !isTemplated(value) &&
          (value instanceof Scalar || value == null)
        ) {
          const raw: unknown = value instanceof Scalar ? value.value : null
          const port = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN
          if (!Number.isInteger(port) || port < 0 || port > 32767) {
            addError('port', t('{{field}} must be an integer between 0 and 32767.', { field: key.value }), value ?? key)
          }
        }
        visit(value)
      }
    } else if (node instanceof YAMLSeq) {
      node.items.forEach(visit)
    }
  }
  documents.forEach((document) => visit(document.contents))

  for (const job of jobs) {
    const secretNode: unknown = job.getIn(['spec', 'tower_auth_secret'], true)
    const namespaceNode: unknown = job.getIn(['metadata', 'namespace'], true)
    const templateNode: unknown = job.getIn(['spec', 'job_template_name'], true)
    const secretName: unknown = secretNode instanceof Scalar ? secretNode.value : undefined
    const namespace: unknown = namespaceNode instanceof Scalar ? namespaceNode.value : defaultNamespace
    const templateName: unknown = templateNode instanceof Scalar ? templateNode.value : undefined
    const templateIsKnown = !isTemplated(templateNode)
    if (templateIsKnown && (typeof templateName !== 'string' || !templateName.trim())) {
      addError('ansibleTemplate', t('AnsibleJob must specify spec.job_template_name.'), templateNode ?? job)
    }
    if (
      isTemplated(secretNode) ||
      isTemplated(namespaceNode) ||
      (typeof namespace === 'string' && namespace.includes('{{'))
    )
      continue
    if (typeof secretName !== 'string' || !secretName.trim() || typeof namespace !== 'string' || !namespace) {
      addError(
        'ansibleSecret',
        t('AnsibleJob must reference a valid tower_auth_secret in its namespace.'),
        secretNode ?? job
      )
      continue
    }
    const key = `${namespace}/${secretName}`
    let connection = connections.get(key)
    if (!connection) {
      connection = checkAnsibleConnection(secretName, namespace, t)
      connections.set(key, connection)
    }
    const result = await connection
    if ('type' in result) {
      addError(result.type, result.message, secretNode)
    } else if (
      templateIsKnown &&
      typeof templateName === 'string' &&
      templateName.trim() &&
      !result.templates.includes(templateName)
    ) {
      addError(
        'ansibleTemplate',
        t('Ansible job template {{name}} was not found on the server.', { name: templateName }),
        templateNode
      )
    }
  }
  return errors
}

export async function analyzeTopologyRepository(
  node: TopologyNode,
  t: TFunction,
  secrets: Secret[] = []
): Promise<RepositoryError[]> {
  const repositoryErrors: RepositoryError[] = []
  const connections = new Map<string, Promise<AnsibleConnection>>()
  const sources = buildRepositorySources(node)
  const defaultNamespace =
    (node.specs.raw as ApplicationSet | undefined)?.spec?.template?.spec?.destination?.namespace || node.namespace
  if (sources.length === 0) {
    repositoryErrors.push({
      type: 'load',
      sourceId: node.id ?? node.name,
      message: t('No repository source is configured.'),
    })
  }
  let remainingFiles = REPOSITORY_YAML_MAX_FILES
  for (const source of sources) {
    const sourceId = getRepositorySourceGroupId(source)
    const access = findRepositorySecretAccess(source.repoURL, secrets)
    let result: Awaited<ReturnType<typeof loadRepositorySource>>
    try {
      result = await loadRepositorySource({ ...source, ...access })
    } catch {
      repositoryErrors.push({
        type: 'load',
        sourceId,
        message: t('Cannot load repository {{repository}} at {{revision}}. Check the URL, revision, and credentials.', {
          repository: source.repoURL,
          revision: source.targetRevision,
        }),
      })
      continue
    }
    if (countGitBranchPathFiles(result.node) === 0) {
      repositoryErrors.push({
        type: 'empty',
        sourceId,
        message: t('No files found in repository source {{path}}.', { path: source.path || source.targetRevision }),
      })
    }
    const files = result.files.slice(0, remainingFiles)
    remainingFiles -= files.length
    for (const file of files) {
      const fileInfo = {
        sourceId,
        path: file.path,
        fileId: result.node.type === 'file' ? sourceId : `${sourceId}::${file.path}`,
      }
      let contents: string
      try {
        contents = await getGitBlobContents(file.url, access?.secretArgs, access?.accessData)
      } catch {
        repositoryErrors.push({ ...fileInfo, type: 'load', message: t('Failed to load repository file.') })
        continue
      }
      repositoryErrors.push(...(await analyzeFile(contents, fileInfo, defaultNamespace, connections, t)))
    }
  }
  node.specs.repositoryErrors = repositoryErrors
  return repositoryErrors
}
