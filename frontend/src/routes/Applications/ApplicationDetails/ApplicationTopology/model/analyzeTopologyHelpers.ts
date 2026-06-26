/* Copyright Contributors to the Open Cluster Management project */
import type { IResource } from '../../../../../resources'
import type { PulseColor, TopologyNode } from '../types'
import { createTopologyAlertTips, getTopologyActions } from './analyzeTopology'

export interface TopologyAlertAction {
  label: string
  action: { url?: string; func?: () => void }
}

export interface TopologyAlertDescription {
  message: string
  bullets?: string[]
}

export interface TopologyAlert {
  status: PulseColor
  title: string
  description?: TopologyAlertDescription
  actions?: TopologyAlertAction[]
  isMajor?: boolean
}

export interface IConditionErrors {
  type: string
  reason: string
  message: string
}

export interface IConditionError {
  name?: string
  namespace?: string
  kind: string
  errors: IConditionErrors[]
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

interface IErrorCondition {
  name: string
  namespace: string
  kind: string
  type: string
  reason: string
}

/**
 * Extracts condition errors from resources with status conditions.
 */
export const extractConditionsErrors = (resources: IResourcesWithStatus[]): IConditionError[] => {
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
        type: condition.type,
        reason: condition.reason,
      })
    })
  })

  const conditionErrors: IConditionError[] = []

  Object.keys(errorMap).forEach((key) => {
    const errorConditions = errorMap[key]

    if (resources.length === 1) {
      const firstItem = errorConditions.shift()
      if (firstItem) {
        conditionErrors.push({
          name: firstItem.name,
          namespace: firstItem.namespace,
          kind: firstItem.kind,
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
          kind: firstItem.kind,
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

  return consolidateConditionErrors(conditionErrors)
}

/** Merges condition errors that share the same name, namespace, and kind. */
const consolidateConditionErrors = (conditionErrors: IConditionError[]): IConditionError[] => {
  const consolidated: IConditionError[] = []
  const byResourceKey = new Map<string, IConditionError>()

  conditionErrors.forEach((item) => {
    const key = `${item.name ?? ''}|${item.namespace ?? ''}|${item.kind}`
    const existing = byResourceKey.get(key)

    if (existing) {
      existing.errors.push(...item.errors)
      return
    }

    const merged: IConditionError = {
      name: item.name,
      namespace: item.namespace,
      kind: item.kind,
      errors: [...item.errors],
    }
    byResourceKey.set(key, merged)
    consolidated.push(merged)
  })

  return consolidated
}

/**
 * Creates and pushes a topology alert from a resource condition error.
 */
export const createTopologyAlert = (
  node: TopologyNode,
  alerts: TopologyAlert[],
  resource: IConditionError,
  isUnique?: boolean
): void => {
  const errors = resource.errors
  if (errors.length === 0) {
    return
  }

  const otherErrors: IConditionErrors[] = []
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

  let firstError: IConditionErrors
  if (remainingErrors.length > 1) {
    firstError = remainingErrors.shift()!
    otherErrors.push(...remainingErrors)
  } else if (remainingErrors.length === 1) {
    firstError = remainingErrors[0]
  } else {
    firstError = otherErrors.shift()!
  }

  const bullets = otherErrors.map((error) => error.message)
  bullets.push(...createTopologyAlertTips(firstError.message))

  const description: TopologyAlertDescription = {
    message: firstError.message,
    bullets: bullets.length > 0 ? bullets : undefined,
  }

  let title = resource.kind
  const reasonOrType = firstError.reason || firstError.type
  if (reasonOrType) {
    const formattedReason = /succeed/i.test(reasonOrType) ? reasonOrType.replace(/succeed/gi, 'Failed') : reasonOrType
    title += ` ${formattedReason}`
  }
  if (isUnique && resource.namespace && resource.name) {
    title += ` ${resource.namespace}/${resource.name}`
  }

  alerts.push({
    status: 'red',
    title,
    description,
    actions: getTopologyActions(node),
    isMajor: true,
  })
}
