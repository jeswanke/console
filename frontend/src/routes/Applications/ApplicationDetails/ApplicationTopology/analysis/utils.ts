/* Copyright Contributors to the Open Cluster Management project */
import type { IResource } from '../../../../../resources'
import type { PulseColor, TopologyNode } from '../types'

export interface TopologyAlertAction {
  label: string
  action?: { url?: string; func?: () => void }
  node?: TopologyNode
}

export interface IBulletDescription {
  title: string
  content: string[]
}

export interface TopologyAlertDescription {
  message: string
  bullets?: IBulletDescription[]
}

export interface IResourcesWithStatus extends IResource {
  status?: {
    conditions?: {
      message: string
      reason: string
      status: 'True' | 'False'
      type: string
    }[]
  }
}

export interface TopologyAlert {
  status: PulseColor
  title: string
  description?: TopologyAlertDescription
  actions?: TopologyAlertAction[]
  isMajor?: boolean
}

export interface IConditionError {
  type: string
  reason: string
  message: string
}

export interface IConditionWithErrors {
  name?: string
  namespace?: string
  kind: string
  resource: IResourcesWithStatus
  errors: IConditionError[]
}

export interface IFilteredError {
  firstError: IConditionError
  otherErrors: IConditionError[]
}

export interface IFilteredConditionError {
  name?: string
  namespace?: string
  kind: string
  resource: IResourcesWithStatus
  errors: IFilteredError[]
}

interface IErrorCondition {
  name: string
  namespace: string
  kind: string
  resource: IResourcesWithStatus
  type: string
  reason: string
}

/** Sets pulse color on all nodes matching the given types. */
export const setNodePulseForTypes = (nodes: TopologyNode[], types: string[], pulse: string): void => {
  nodes.forEach((node) => {
    if (types.includes(node.type)) {
      node.specs.pulse = pulse
    }
  })
}

/**
 * Extracts condition errors from resources with status conditions.
 */
export const extractConditionsErrors = (resources: IResourcesWithStatus[]): IFilteredConditionError[] => {
  const errorMap: Record<string, IErrorCondition[]> = {}

  resources.forEach((resource) => {
    const conditions = resource.status?.conditions ?? []
    conditions.forEach((condition) => {
      const typeLower = condition.type.toLowerCase()
      const reasonLower = condition.reason?.toLowerCase()
      const hasErrorInTypeOrReason = typeLower.includes('error') || (reasonLower?.includes('error') ?? false)
      const positiveStatusTypes = ['satisfied', 'uptodate', 'generated']
      const typeHasPositiveStatus = positiveStatusTypes.some((keyword) => typeLower.includes(keyword))
      const isErrorCondition =
        (hasErrorInTypeOrReason && (condition.status === undefined || condition.status === 'True')) ||
        (condition.status === 'False' && typeHasPositiveStatus)

      if (!isErrorCondition) {
        return
      }

      if (!errorMap[condition.message]) {
        errorMap[condition.message] = []
      }

      errorMap[condition.message].push({
        kind: resource.kind,
        name: resource.metadata?.name ?? '',
        namespace: resource.metadata?.namespace ?? '',
        resource: resource,
        type: condition.type,
        reason: condition.reason,
      })
    })
  })

  const conditionErrors: IConditionWithErrors[] = []

  Object.keys(errorMap).forEach((key) => {
    const errorConditions = errorMap[key]

    if (resources.length === 1) {
      const firstItem = errorConditions.shift()
      if (firstItem) {
        conditionErrors.push({
          name: firstItem.name,
          namespace: firstItem.namespace,
          kind: firstItem.kind,
          resource: firstItem.resource,
          errors: [
            {
              message: key,
              reason: firstItem.reason,
              type: firstItem.type,
            },
          ],
        })
      }
    } else if (resources.length === errorConditions.length) {
      const firstItem = errorConditions.shift()
      if (firstItem) {
        conditionErrors.push({
          name: firstItem.name,
          namespace: firstItem.namespace,
          kind: firstItem.kind,
          resource: firstItem.resource,
          errors: [
            {
              message: key,
              reason: firstItem.reason,
              type: firstItem.type,
            },
          ],
        })
      }
    } else {
      errorConditions.forEach((item) => {
        conditionErrors.push({
          name: item.name,
          namespace: item.namespace,
          kind: item.kind,
          resource: item.resource,
          errors: [
            {
              message: key,
              reason: item.reason,
              type: item.type,
            },
          ],
        })
      })
    }
  })

  const consolidatedConditionErrors = consolidateConditionErrors(conditionErrors)
  return consolidatedConditionErrors
    .map((conditionError) => filteredConditionErrors(conditionError))
    .filter((conditionError): conditionError is IFilteredConditionError => conditionError !== undefined)
}

/** Merges condition errors that share the same name, namespace, and kind. */
const consolidateConditionErrors = (conditionErrors: IConditionWithErrors[]): IConditionWithErrors[] => {
  const consolidated: IConditionWithErrors[] = []
  const byResourceKey = new Map<string, IConditionWithErrors>()

  conditionErrors.forEach((item) => {
    const key = `${item.name ?? ''}|${item.namespace ?? ''}|${item.kind}`
    const existing = byResourceKey.get(key)

    if (existing) {
      existing.errors.push(...item.errors)
      return
    }

    const merged: IConditionWithErrors = {
      name: item.name,
      namespace: item.namespace,
      kind: item.kind,
      resource: item.resource,
      errors: [...item.errors],
    }
    byResourceKey.set(key, merged)
    consolidated.push(merged)
  })

  return consolidated
}

const filterErrors = (errors: IConditionError[]): IFilteredError => {
  const otherErrors: IConditionError[] = []
  const remainingErrors = errors.filter((error) => {
    if (error.reason?.toLowerCase().includes('succeed') ?? false) {
      otherErrors.push({
        ...error,
        message: `${error.message} failed`,
      })
      return false
    }
    return true
  })

  let firstError: IConditionError
  if (remainingErrors.length > 1) {
    firstError = remainingErrors.shift()!
    otherErrors.push(...remainingErrors)
  } else if (remainingErrors.length === 1) {
    firstError = remainingErrors[0]
  } else {
    firstError = otherErrors.shift()!
  }

  return {
    firstError,
    otherErrors,
  }
}

export const filteredConditionErrors = (conditionError: IConditionWithErrors): IFilteredConditionError | undefined => {
  if (conditionError.errors.length === 0) {
    return
  }

  return {
    name: conditionError.name,
    namespace: conditionError.namespace,
    kind: conditionError.kind,
    resource: conditionError.resource,
    errors: conditionError.errors.map((error) => filterErrors([error])),
  }
}
/**
 * Creates and pushes a topology alert from a resource condition error.
 */
export const createTopologyAlert = (
  suggestions: IBulletDescription[],
  actions: TopologyAlertAction[],
  alerts: TopologyAlert[],
  filteredError: IFilteredConditionError,
  status: PulseColor = 'red',
  isMajor: boolean = true,
  isUnique?: boolean
): void => {
  if (filteredError.errors.length === 0) {
    return
  }

  const { firstError } = filteredError.errors[0]
  const otherErrors = filteredError.errors.flatMap((filtered, index) =>
    index === 0 ? filtered.otherErrors : [filtered.firstError, ...filtered.otherErrors]
  )

  const bullets: IBulletDescription[] = otherErrors.map((error) => ({
    title: error.message,
    content: [],
  }))
  bullets.push(...suggestions)

  const description: TopologyAlertDescription = {
    message: firstError.message,
    bullets: bullets.length > 0 ? bullets : undefined,
  }

  let title = filteredError.kind
  const reasonOrType = firstError.reason || firstError.type
  if (reasonOrType) {
    const formattedReason = /succeed/i.test(reasonOrType) ? reasonOrType.replace(/succeed/gi, 'Failed') : reasonOrType
    title += ` ${formattedReason}`
  }
  if (isUnique && filteredError.namespace && filteredError.name) {
    title += ` ${filteredError.namespace}/${filteredError.name}`
  }

  alerts.push({
    status,
    title,
    description,
    actions,
    isMajor,
  })
}
