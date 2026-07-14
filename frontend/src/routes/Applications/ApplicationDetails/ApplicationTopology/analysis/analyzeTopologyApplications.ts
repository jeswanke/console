/* Copyright Contributors to the Open Cluster Management project */
import type { IResource } from '../../../../../resources'
import { fleetResourceRequest } from '../../../../../resources/utils/fleet-resource-request'
import type { AppSetCluster, ArgoAppResource, PulseColor, TopologyNode } from '../types'
import type { IFilteredConditionError, IResourcesWithStatus, TopologyAlert } from './analyzeTopology'
import { createSuggestsApplication } from './createSuggestsApplication'
import {
  createTopologyAlert,
  extractConditionsErrors,
  type IBulletDescription,
  TopologyAlertActionType,
  type TopologyAlertDescription,
} from './utils'

const DEPLOYMENT_NODE_EXCLUDED_TYPES = new Set([
  'application',
  'applicationset',
  'placement',
  'placementDecision',
  'cluster',
  'git',
  'chart',
  'subscription',
])

const MAX_PULL_APP_FETCHES = 3
const MAX_CONDITION_ERROR_ALERTS = 3

interface ParsedAppName {
  clusterName: string
  appName: string
}

interface SyncAlertEntry {
  kind: string
  healthSyncKey: string
  clusterName: string
}

const formatClusterListContent = (clusters: string[]): string[] => {
  const sorted = [...clusters].sort()
  if (sorted.length <= 3) {
    return sorted
  }
  return [...sorted.slice(0, 3), `and ${sorted.length - 3} more`]
}

const buildHealthSyncKey = (healthStatus: string | undefined, syncStatus: string | undefined): string => {
  const parts: string[] = []
  if (syncStatus && syncStatus !== 'Synced') {
    parts.push(syncStatus)
  }
  if (healthStatus && healthStatus !== 'Healthy') {
    parts.push(healthStatus)
  }
  return parts.join('/')
}

const parseCompositeAppName = (
  compositeName: string,
  appSetName: string,
  sortedClusterNames: string[]
): ParsedAppName => {
  const namePart = compositeName.startsWith(appSetName) ? compositeName.substring(appSetName.length + 1) : compositeName

  const clusterName =
    sortedClusterNames.find(
      (cluster) => namePart === cluster || namePart.includes(`-${cluster}`) || namePart.includes(`${cluster}-`)
    ) ?? ''

  const appName = clusterName ? namePart.replace(clusterName, '').replaceAll(/(?:^-)|(?:-$)/g, '') : namePart

  return { clusterName, appName: appName || appSetName }
}

const getClustersFromBadResourceMap = (badResourceMap: Record<string, Record<string, string[]>>): Set<string> => {
  const clusters = new Set<string>()
  const applicationEntries = badResourceMap.Application
  if (!applicationEntries) {
    return clusters
  }

  Object.values(applicationEntries).forEach((mapKeys) => {
    mapKeys.forEach((mapKey) => {
      const [clusterName] = mapKey.split('/')
      if (clusterName) {
        clusters.add(clusterName)
      }
    })
  })
  return clusters
}

const getAppForCluster = (appMap: Record<string, IResource>, clusterName: string): IResource | undefined => {
  return Object.entries(appMap).find(([key]) => key.startsWith(`${clusterName}/`))?.[1]
}

const isBadDeployResourceHealth = (resource: ArgoAppResource): boolean => {
  const health = resource.health?.status
  const sync = resource.status
  return health !== 'Healthy' && sync !== 'Synced'
}

const isDeploymentNodeUnhealthy = (deploymentNode: TopologyNode, appsetClusters: string[]): boolean => {
  const resources = (deploymentNode.specs?.resources ?? []) as ArgoAppResource[]

  if (deploymentNode.specs.resourceCount !== appsetClusters.length) {
    const resourceClusters = new Set(resources.map((resource) => resource.cluster).filter(Boolean) as string[])
    if (appsetClusters.some((clusterName) => !resourceClusters.has(clusterName))) {
      return true
    }
  }

  return resources.some((resource) => {
    const cluster = resource.cluster as string | undefined
    return cluster && isBadDeployResourceHealth(resource)
  })
}

const setPartialUnhealthyDeploymentNodePulses = (deploymentNodes: TopologyNode[], appsetClusters: string[]): void => {
  const unhealthyNodes = deploymentNodes.filter((node) => isDeploymentNodeUnhealthy(node, appsetClusters))

  if (unhealthyNodes.length > 0 && unhealthyNodes.length < deploymentNodes.length) {
    unhealthyNodes.forEach((node) => {
      node.specs.pulse = 'red'
    })
  }
}

const formatKindList = (kinds: string[]): string => {
  const sorted = [...new Set(kinds)].sort((a, b) => {
    if (a === 'Application') return -1
    if (b === 'Application') return 1
    return a.localeCompare(b)
  })
  const displayed = sorted.slice(0, 5).join(', ')
  const suffix = sorted.length > 5 ? ` and ${sorted.length - 5} more` : ''
  return `Kinds: ${displayed}${suffix}`
}

const getConsolidatedSyncStatus = (healthSyncKeys: string[]): PulseColor => {
  let status: PulseColor = 'yellow'
  healthSyncKeys.forEach((key) => {
    if (key.includes('Degraded')) {
      status = 'red'
    } else if ((key.includes('Progressing') || key.includes('OutOfSync')) && status !== 'red') {
      status = 'orange'
    }
  })
  return status
}

const SYNC_ALERT_SUGGESTION_BULLETS: IBulletDescription[] = [
  { title: 'Wait a few minutes for syncing to complete', content: [] },
  { title: 'You can also try resyncing resources', content: [] },
  { title: 'If the problem persists, try editing the appset in Argo CD', content: [] },
]

const dedupeAppSetAppsErrorsByReason = (errors: IFilteredConditionError[]): IFilteredConditionError[] => {
  const seenReasons = new Set<string>()

  return errors.filter((appSetAppsError) => {
    const reasons = appSetAppsError.errors.flatMap((filtered) => [
      filtered.firstError.reason,
      ...filtered.otherErrors.map((error) => error.reason),
    ])

    if (reasons.some((reason) => seenReasons.has(reason))) {
      return false
    }

    reasons.forEach((reason) => seenReasons.add(reason))
    return true
  })
}

const buildConsolidatedSyncDescription = (syncAlerts: SyncAlertEntry[]): TopologyAlertDescription => {
  const byHealthSyncKey = new Map<string, { kinds: Set<string>; clusters: Set<string> }>()

  syncAlerts.forEach(({ kind, healthSyncKey, clusterName }) => {
    if (!byHealthSyncKey.has(healthSyncKey)) {
      byHealthSyncKey.set(healthSyncKey, { kinds: new Set(), clusters: new Set() })
    }
    const entry = byHealthSyncKey.get(healthSyncKey)!
    entry.kinds.add(kind)
    entry.clusters.add(clusterName)
  })

  const sortedKeys = [...byHealthSyncKey.keys()].sort()

  if (sortedKeys.length === 1) {
    const healthSyncKey = sortedKeys[0]
    const { kinds, clusters } = byHealthSyncKey.get(healthSyncKey)!
    return {
      message: `Status: ${healthSyncKey}`,
      bullets: [
        {
          title: formatKindList([...kinds]),
          content: formatClusterListContent([...clusters]),
        },
        ...(healthSyncKey !== 'Progressing' ? SYNC_ALERT_SUGGESTION_BULLETS : []),
      ],
    }
  }

  const bullets: IBulletDescription[] = [
    ...sortedKeys.map((healthSyncKey) => {
      const { kinds, clusters } = byHealthSyncKey.get(healthSyncKey)!
      return {
        title: `Status: ${healthSyncKey}`,
        content: [formatKindList([...kinds]), ...formatClusterListContent([...clusters])],
      }
    }),
    ...(sortedKeys.some((healthSyncKey) => healthSyncKey !== 'Progressing') ? SYNC_ALERT_SUGGESTION_BULLETS : []),
  ]

  return {
    message: '',
    bullets,
  }
}

const pushSyncAlert = (
  title: string,
  status: PulseColor,
  description: TopologyAlertDescription,
  appSet: TopologyNode,
  alerts: TopologyAlert[]
): void => {
  const actions = [
    {
      label: 'Edit application',
      type: TopologyAlertActionType.editAppSet,
      node: appSet,
    },
    {
      label: 'Edit YAML',
      type: TopologyAlertActionType.editYaml,
      node: appSet,
      highlightEditorPath: 'ApplicationSet.spec.template.spec.sources',
    },
    {
      label: 'Sync resources',
      type: TopologyAlertActionType.syncResources,
      node: appSet,
    },
    {
      label: 'Launch Argo editor',
      type: TopologyAlertActionType.launchArgo,
      node: appSet,
    },
  ]
  const alert = createTopologyAlert(title, status, description, actions)
  if (!alerts.some((existingAlert) => existingAlert.id === alert.id)) {
    alerts.push(alert)
  }
}

/**
 * Analyzes ApplicationSet application health, sync status, deployment coverage, and condition errors.
 */
export const analyzeTopologyApplications = async (
  appSet: TopologyNode,
  nodes: TopologyNode[],
  alerts: TopologyAlert[]
): Promise<IFilteredConditionError[]> => {
  const syncAlerts: SyncAlertEntry[] = []
  const appMap: Record<string, IResource> = {}
  const badResourceMap: Record<string, Record<string, string[]>> = {}

  const appSetName = appSet.name
  const namespace = appSet.namespace
  const appSetApps = (appSet.specs.appSetApps ?? []) as IResourcesWithStatus[]
  const appsetClusters = ((appSet.specs.appSetClusters ?? []) as AppSetCluster[]).map((cluster) => cluster.name)
  const sortedClusterNames = [...appsetClusters].sort((a, b) => b.length - a.length)
  const isAppSetPullModel = Boolean(appSet.specs.isAppSetPullModel)

  /////////////////////////////////////////////
  // create alert for unhealthy/unsynced applications
  /////////////////////////////////////////////
  appSetApps.forEach((app) => {
    const compositeName = app.metadata?.name ?? ''
    const { clusterName, appName } = parseCompositeAppName(compositeName, appSetName, sortedClusterNames)
    if (!clusterName) {
      return
    }

    const mapKey = `${clusterName}/${appName}`
    appMap[mapKey] = app

    const syncStatus = (app.status as { sync?: { status?: string } } | undefined)?.sync?.status
    const healthStatus = (app.status as { health?: { status?: string } } | undefined)?.health?.status
    const healthSyncKey = buildHealthSyncKey(healthStatus, syncStatus)

    if (healthSyncKey) {
      if (!badResourceMap.Application) {
        badResourceMap.Application = {}
      }
      if (!badResourceMap.Application[healthSyncKey]) {
        badResourceMap.Application[healthSyncKey] = []
      }
      badResourceMap.Application[healthSyncKey].push(mapKey)

      syncAlerts.push({ kind: 'Application', healthSyncKey, clusterName })
    }
  })

  /////////////////////////////////////////////
  // get list of clusters on where app resources haven't deployed correctly
  /////////////////////////////////////////////
  const badDeploySet = new Set<string>()
  const deploymentNodes = nodes.filter((node) => !DEPLOYMENT_NODE_EXCLUDED_TYPES.has(node.type))

  for (const deploymentNode of deploymentNodes) {
    const resources = (deploymentNode.specs?.resources ?? []) as ArgoAppResource[]

    if (deploymentNode.specs.resourceCount !== appsetClusters.length) {
      const resourceClusters = new Set(resources.map((resource) => resource.cluster).filter(Boolean) as string[])
      appsetClusters.forEach((clusterName) => {
        if (!resourceClusters.has(clusterName)) {
          badDeploySet.add(clusterName)
        }
      })
    }

    resources.forEach((resource) => {
      const cluster = resource.cluster as string | undefined
      if (cluster && isBadDeployResourceHealth(resource)) {
        badDeploySet.add(cluster)
      }
    })

    if (badDeploySet.size === appsetClusters.length) {
      break
    }
  }

  const hasApplicationIssues = Boolean(badResourceMap.Application && Object.keys(badResourceMap.Application).length > 0)
  if (!hasApplicationIssues && badDeploySet.size === 0) {
    return []
  }

  const badAppClusters = getClustersFromBadResourceMap(badResourceMap)
  Object.keys(appMap).forEach((mapKey) => {
    const [clusterName] = mapKey.split('/')
    if (!badAppClusters.has(clusterName) && !badDeploySet.has(clusterName)) {
      delete appMap[mapKey]
    }
  })

  /////////////////////////////////////////////
  // get condition errors of applications in appMap
  /////////////////////////////////////////////
  if (isAppSetPullModel) {
    const entries = Object.entries(appMap).slice(0, MAX_PULL_APP_FETCHES)
    await Promise.all(
      entries.map(async ([mapKey, app]) => {
        const [clusterName, appName] = mapKey.split('/')
        const name = app.metadata?.name ?? ''
        if (!clusterName || !name) {
          return
        }

        try {
          const response = await fleetResourceRequest('GET', clusterName, {
            apiVersion: 'argoproj.io/v1alpha1',
            kind: 'Application',
            name,
            namespace,
          })
          if ('errorMessage' in response) {
            const alert = createTopologyAlert('Application Missing', 'red', {
              message: `Cannot find '${namespace}/${appName}' on ${clusterName}`,
              bullets: [
                {
                  title: `For pulled applications, make sure the OpenShift GitOps Operator is installed on ${clusterName}`,
                  content: [],
                },
              ],
            })
            if (!alerts.some((existingAlert) => existingAlert.id === alert.id)) {
              alerts.push(alert)
            }
            appSet.specs.pulse = 'red'
            return
          }
          appMap[mapKey] = response
        } catch {
          // Keep hub application data when remote fetch fails.
        }
      })
    )
  }

  /////////////////////////////////////////////
  // create alerts for apps with condition errors
  /////////////////////////////////////////////
  let appSetAppsErrors: IFilteredConditionError[] = []
  if (hasApplicationIssues) {
    const badAppResources = Object.values(badResourceMap.Application ?? {})
      .flat()
      .map((mapKey) => appMap[mapKey])
      .filter((app): app is IResource => app !== undefined) as IResourcesWithStatus[]

    appSetAppsErrors = dedupeAppSetAppsErrorsByReason(extractConditionsErrors(badAppResources)).slice(
      0,
      MAX_CONDITION_ERROR_ALERTS
    )

    if (appSetAppsErrors.length > 0) {
      appSetAppsErrors.forEach((appSetAppsError) => {
        createSuggestsApplication(appSet, appSetAppsError, alerts)
      })
      appSet.specs.pulse = 'red'
      setPartialUnhealthyDeploymentNodePulses(deploymentNodes, appsetClusters)
    }
  }

  if (appSetAppsErrors.length > 0) {
    return appSetAppsErrors
  }

  /////////////////////////////////////////////
  // create alert for unhealthy/unsynced deployments
  /////////////////////////////////////////////
  badDeploySet.forEach((clusterName) => {
    const app = getAppForCluster(appMap, clusterName)
    const resources = ((app?.status as { resources?: ArgoAppResource[] } | undefined)?.resources ??
      []) as ArgoAppResource[]

    resources.forEach((resource) => {
      const healthStatus = resource.health?.status
      const syncStatus = resource.status
      if (healthStatus === 'Healthy' && syncStatus === 'Synced') {
        return
      }

      const healthSyncKey = buildHealthSyncKey(healthStatus, syncStatus)
      if (!healthSyncKey) {
        return
      }

      syncAlerts.push({ kind: resource.kind, healthSyncKey, clusterName })
    })
  })

  if (syncAlerts.length > 0) {
    const healthSyncKeys = [...new Set(syncAlerts.map((entry) => entry.healthSyncKey))]
    setPartialUnhealthyDeploymentNodePulses(deploymentNodes, appsetClusters)
    pushSyncAlert(
      'Some resources are not healthy or synced on these clusters',
      getConsolidatedSyncStatus(healthSyncKeys),
      buildConsolidatedSyncDescription(syncAlerts),
      appSet,
      alerts
    )
  }

  return appSetAppsErrors
}
