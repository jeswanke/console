/* Copyright Contributors to the Open Cluster Management project */
import { Http2ServerRequest, Http2ServerResponse } from 'node:http2'
import { applicationCache, ApplicationStatusMap } from './applications'
import { getApplicationClusters, getApplicationsHelper, getApplicationType, getClusters } from './utils'
import { Cluster, IApplicationSet, IResource } from '../../resources/resource'
import { getHubClusterName, getKubeResources } from '../events'
import { getAppSetAppsMap, getAppStatusByNameMap } from './applicationsArgo'
import { inflateApps } from '../../lib/compression'
import { getToken } from '../../lib/token'
import { unauthorized } from '../../lib/respond'
import { jsonRequest, resourceUrl } from '../../lib/json-request'
import get from 'get-value'

interface IUIData {
  // list of clusters this app is on
  clusterList: string[]
  // placementName for this appset, [list of other appsets using same]
  appSetPlacementData?: (string | string[])[]
  // all apps that belong to this appset
  appSetApps?: IResource[]
  //used in list--for appsets -- shows combined statues for all apps in this appset
  appClusterStatuses?: ApplicationStatusMap[]
  // used in topology--for appsets -- shows status for each app in this appset
  appStatusByNameMap?: Record<string, { health: { status: string }; sync: { status: string } }>
  // cached resource is out of date -- using fetched resource -- in topology, if set, speed up refresh
  isFetchedResource?: boolean
}

export function requestAggregatedUIData(req: Http2ServerRequest, res: Http2ServerResponse): void {
  const chucks: string[] = []
  req.on('data', (chuck: string) => {
    chucks.push(chuck)
  })
  req.on('end', async () => {
    const token = getToken(req)
    if (!token) return unauthorized(req, res)
    void token
    const body = chucks.join()
    let resource: IResource
    try {
      resource = JSON.parse(body) as IResource
    } catch (error) {
      console.error(error + body.substring(0, 64))
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Invalid request body' }))
      return
    }

    // if (app) {
    //   // Recursively find any object with clusterDecisionResource within app.spec
    //   const generatorWithCDR = findObjectWithKey(safeGet(app, 'spec', {}), 'clusterDecisionResource')
    //   placementName = safeGet(
    //     generatorWithCDR,
    //     'clusterDecisionResource.labelSelector.matchLabels["cluster.open-cluster-management.io/placement"]',
    //     ''
    //   )

    //   placement = recoilStates.placementDecisions?.find((placementDecision: PlacementDecision) => {
    //     const labels = placementDecision.metadata.labels as Record<string, string>
    //     return labels?.['cluster.open-cluster-management.io/placement'] === placementName
    //   })

    //   const decisionOwnerReference = safeGet(placement, 'metadata.ownerReferences', undefined) as
    //     | Array<{ kind?: string; name?: string; namespace?: string }>
    //     | undefined

    //   if (decisionOwnerReference && decisionOwnerReference[0]) {
    //     const owner0 = decisionOwnerReference[0]
    //     relatedPlacement = recoilStates.placements.find(
    //       (resource: any) =>
    //         resource.kind === owner0.kind &&
    //         resource.metadata.name === owner0.name &&
    //         resource.metadata.namespace === namespace
    //     )
    //   }

    //   if (
    //     safeGet(app, 'spec.template.metadata.annotations["apps.open-cluster-management.io/ocm-managed-cluster"]')
    //   ) {
    //     isAppSetPullModel = true
    //   }
    // }

    const argoAppSets = await inflateApps(getApplicationsHelper(applicationCache, ['appset']))
    const clusters: Cluster[] = await getClusters()
    const result: IUIData = await getUIData(token, resource, argoAppSets, clusters)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result))
  })
}

export async function getUIData(
  token: string,
  resource: IResource,
  argoAppSets: IResource[],
  clusters: Cluster[],
  clusterList?: string[],
  appClusterStatuses?: ApplicationStatusMap[]
): Promise<IUIData> {
  const isAppList = appClusterStatuses !== undefined
  const type = getApplicationType(resource)

  // appsets have lots more data
  if (type === 'appset') {
    // for appList -- if clusterList is empty try to create list from a fetched version of resource
    // for topology -- always fetch the resource and create a fresh clusterList
    //    if (clusterList) {
    const resourcePath = resourceUrl(resource)
    let tst
    try {
      resource = await jsonRequest(resourcePath, token)
      const placementDecisions = await getKubeResources(
        'PlacementDecision',
        'cluster.open-cluster-management.io/v1beta1'
      )
      const hubClusterName = getHubClusterName()
      const localCluster = clusters.find((cls) => cls.name === hubClusterName)
      const subscriptions = await getKubeResources('Subscription', 'apps.open-cluster-management.io/v1')
      tst = clusterList = await getApplicationClusters(
        resource,
        type,
        subscriptions,
        placementDecisions,
        localCluster,
        clusters
      )
    } catch (error) {
      /* empty */
    }
    //   }
    console.log('tst', tst)
    const appSetApps = getAppSetAppsMap()[resource.metadata.name] || []
    const appSetPlacementData = getAppSetPlacementData(resource as IApplicationSet, argoAppSets as IApplicationSet[])
    if (isAppList) {
      // for app list -- use the cached appClusterStatuses
      return {
        clusterList: clusterList || [],
        appSetApps: appSetApps,
        appSetPlacementData: appSetPlacementData,
        appClusterStatuses: appClusterStatuses || [],
      }
    } else {
      // for topology -- use the fetched appStatusByNameMap
      return {
        clusterList: clusterList || [],
        appSetApps: appSetApps,
        appSetPlacementData: appSetPlacementData,
        appStatusByNameMap: getAppStatusByNameMap()[`${resource.metadata.namespace}/${resource.metadata.name}`] || {},
      }
    }
  }
  return {
    clusterList: clusterList || [],
  }
}

export function getAppSetPlacementData(appSet: IApplicationSet, applicationSets: IApplicationSet[]) {
  const appSetsSharingPlacement: string[] = []
  const currentAppSetPlacement = getPlacementNameFromAppSetSpec(appSet.spec as Record<string, unknown>)
  applicationSets.forEach((item) => {
    const appSetPlacement = getPlacementNameFromAppSetSpec(item.spec as Record<string, unknown>)
    /* istanbul ignore if */
    if (
      item.metadata.name !== appSet.metadata?.name ||
      (item.metadata.name === appSet.metadata?.name && item.metadata.namespace !== appSet.metadata?.namespace)
    ) {
      if (appSetPlacement && appSetPlacement === currentAppSetPlacement && item.metadata.name) {
        appSetsSharingPlacement.push(item.metadata.name)
      }
    }
  })
  return [currentAppSetPlacement, appSetsSharingPlacement]
}

/**
 * Get the placement name from an ApplicationSet spec by finding the generator
 * that has clusterDecisionResource and reading its placement label.
 */

const appSetPlacementStr = [
  'clusterDecisionResource',
  'labelSelector',
  'matchLabels',
  'cluster.open-cluster-management.io/placement',
]
export function getPlacementNameFromAppSetSpec(spec: Record<string, unknown> | undefined): string {
  if (!spec || typeof spec !== 'object') return ''
  const generatorWithCDR = findObjectWithKey(spec, 'clusterDecisionResource')
  if (!generatorWithCDR) return ''
  return (get(generatorWithCDR, appSetPlacementStr, { default: '' }) as string) || ''
}

/**
 * Recursively search an object for a property with the given key.
 * Returns the first matching object that contains the key, or undefined.
 */
function findObjectWithKey(obj: unknown, key: string): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const record = obj as Record<string, unknown>
  if (key in record) return record
  for (const value of Object.values(record)) {
    const found = findObjectWithKey(value, key)
    if (found) return found
  }
  return undefined
}
