/* Copyright Contributors to the Open Cluster Management project */

import { fetchAggregate, SupportedAggregate } from '../../../../../lib/useAggregates'
import {
  Application,
  ApplicationSetApiVersion,
  ApplicationSetKind,
  ArgoApplicationApiVersion,
  ArgoApplicationKind,
  IResource,
  Placement,
  PlacementDecision,
  Subscription,
} from '../../../../../resources'
import { getResource } from '../../../../../resources/utils'
import { fleetResourceRequest } from '../../../../../resources/utils/fleet-resource-request'
import type { ApplicationModel, ManagedCluster, RecoilStates } from '../types'
import { safeGet, safeSet } from '../utils'
import { getSubscriptionAnnotations, isLocalSubscription } from '../../../helpers/subscriptions'
import { getSubscriptionApplication } from './applicationSubscription'
import { getArgoDestinationCluster } from './topologyArgo'
import { Service } from '../../../../../resources'

/**
 * Resolve an application model for ACM, Argo, ApplicationSet, OCP, or Flux app kinds.
 * The function inspects the requested apiVersion and returns a normalized ApplicationModel
 * used by Application Topology views.
 */
export const getApplication = async (
  namespace: string,
  name: string,
  backendUrl: string,
  selectedChannel: string | undefined,
  recoilStates: RecoilStates,
  cluster?: string,
  apiversion?: string,
  clusters?: ManagedCluster[],
  hubClusterName: string = 'local-cluster'
): Promise<ApplicationModel | undefined> => {
  let app: Application | undefined
  let model: ApplicationModel | undefined
  let placement: PlacementDecision | undefined
  let relatedPlacement: Placement | undefined

  // get application
  const apiVersion = apiversion || 'application.app.k8s.io' // defaults to ACM app
  const isAppSet = apiVersion === 'applicationset.argoproj.io'
  const isOCPApp = apiVersion === 'ocp'
  const isFluxApp = apiVersion === 'flux'
  const { applications } = recoilStates

  ///////////////////////////////////////////
  //////// SUBSCRIPTION /////////////////////
  ///////////////////////////////////////////
  if (apiVersion === 'application.app.k8s.io') {
    app = applications.find((a: Application) => {
      return a?.metadata?.name === name && a?.metadata?.namespace === namespace
    })
  }

  ///////////////////////////////////////////
  //////// ARGO APP SET /////////////////////
  ///////////////////////////////////////////
  // get argo app set
  if (!app && isAppSet) {
    // appset is not part of recoil
    app = {
      apiVersion: ApplicationSetApiVersion,
      kind: ApplicationSetKind,
      metadata: {
        name,
        namespace,
      },
    } as unknown as Application
  }

  ///////////////////////////////////////////
  //////// ARGO APP /////////////////////////
  ///////////////////////////////////////////
  // get argo
  if (!app && apiVersion === 'application.argoproj.io') {
    if (cluster) {
      // get argo app definition from managed cluster
      app = await getRemoteArgoApp(cluster, 'application', ArgoApplicationApiVersion, name, namespace)
      if (app) {
        safeSet(app as object, 'status.cluster', cluster)
      }
    } else {
      // argo app is not part of recoil
      app = (await getResource({
        apiVersion: ArgoApplicationApiVersion,
        kind: ArgoApplicationKind,
        metadata: {
          name,
          namespace,
        },
      }).promise) as Application
    }
  }

  ///////////////////////////////////////////
  //////// OCP APP ///////////////////////////
  ///////////////////////////////////////////
  // generate ocp app boiler plate
  if (!app && isOCPApp) {
    const clusterInfo = findCluster(clusters ?? [], cluster, false)
    app = {
      apiVersion: 'ocp',
      kind: 'OCPApplication',
      metadata: {
        name,
        namespace,
      },
      cluster: clusterInfo,
    } as unknown as Application
  }

  ///////////////////////////////////////////
  //////// FLUX APP //////////////////////////
  ///////////////////////////////////////////
  // generate flux app boiler plate
  if (!app && isFluxApp) {
    const clusterInfo = findCluster(clusters ?? [], cluster, false)
    app = {
      apiVersion: 'flux',
      kind: 'FluxApplication',
      metadata: {
        name,
        namespace,
      },
      cluster: clusterInfo,
    } as unknown as Application
  }

  ///////////////////////////////////////////
  //////// COLLECT APP RESOURCES ////////////
  ///////////////////////////////////////////
  // collect app resources
  if (app) {
    const type = getApplicationType(app as IResource)
    model = {
      name,
      namespace,
      app,
      metadata: (app as any).metadata,
      placement,
      isArgoApp: safeGet(app, 'apiVersion', '').indexOf('argoproj.io') > -1 && !isAppSet,
      isAppSet: isAppSet,
      isOCPApp,
      isFluxApp,
      relatedPlacement,
    }

    if (type !== 'appset') {
      ;(model as any).clusterList = getApplicationClusters(
        app as IResource,
        type,
        recoilStates.subscriptions ?? [],
        recoilStates.placementDecisions ?? [],
        hubClusterName,
        clusters ?? []
      )
      if (type === 'subscription') {
        return await getSubscriptionApplication(model as any, app, selectedChannel, recoilStates)
      }
    } else {
      const uidata: any = await fetchAggregate(SupportedAggregate.appSetData, backendUrl, app)
      ;(model as any).clusterList = uidata?.clusterList
      ;(model as any).appSetApps = uidata.appSetApps
      ;(model as any).appStatusByNameMap = uidata.appStatusByNameMap
      ;(model as any).appSetClusters = uidata.clusterList.reduce((list: any[], clusterName: string) => {
        const _cluster = (clusters ?? []).find((c) => c.name === clusterName)
        if (_cluster) {
          list.push({
            name: _cluster.name,
            namespace: _cluster.namespace,
            url: _cluster.kubeApiServer,
            status: _cluster.status,
            creationTimestamp: _cluster.creationTimestamp,
          })
        }
        return list
      }, [])
    }
  }
  return model
}

/**
 * Find a managed cluster by name or by kubeApiServer URL.
 */
export const findCluster = (
  managedClusters: ManagedCluster[],
  searchValue: string | undefined,
  findByURL: boolean | undefined
): ManagedCluster | undefined => {
  for (let i = 0; i < managedClusters.length; i++) {
    if (!findByURL) {
      if (managedClusters[i].name === searchValue) {
        return managedClusters[i]
      }
    } else {
      const url = managedClusters[i].kubeApiServer
      if (url === searchValue) {
        return managedClusters[i]
      }
    }
  }

  return undefined
}

/**
 * Retrieve an Argo Application definition from a managed cluster via MCV.
 */
const getRemoteArgoApp = async (
  cluster: string,
  kind: string,
  apiVersion: string,
  name: string,
  namespace: string
): Promise<any> => {
  let response: any

  try {
    response = await fleetResourceRequest('GET', cluster, {
      apiVersion,
      kind,
      name,
      namespace,
    })
  } catch (err) {
    console.error('Error getting remote Argo app', err)
  }

  if (response) {
    return response
  }
}

/**
 * Recursively search an object for a property with the given key.
 * Returns the first matching object that contains the key, or undefined.
 */
export const findObjectWithKey = (obj: unknown, key: string): Record<string, unknown> | undefined => {
  if (!obj || typeof obj !== 'object') return undefined
  const record = obj as Record<string, unknown>
  if (key in record) return record
  for (const value of Object.values(record)) {
    const found = findObjectWithKey(value, key)
    if (found) return found
  }
  return undefined
}

function getSubscriptionCluster(
  resource: IResource,
  subscriptions: IResource[],
  placementDecisions: IResource[]
): string[] {
  const clusterSet = new Set<string>()
  const subAnnotationArray = getSubscriptionAnnotations(resource)
  for (const sa of subAnnotationArray) {
    if (isLocalSubscription(sa, subAnnotationArray)) {
      continue
    }
    const subDetails = sa.split('/')
    subscriptions.forEach((sub) => {
      if (sub.metadata?.name === subDetails[1] && sub.metadata?.namespace === subDetails[0]) {
        const placementRef = (sub as Subscription).spec?.placement?.placementRef
        const placement = placementDecisions.find(
          (placementDecision) =>
            placementDecision.metadata?.labels?.['cluster.open-cluster-management.io/placement'] ===
              placementRef?.name ||
            placementDecision.metadata?.labels?.['cluster.open-cluster-management.io/placementrule'] ===
              placementRef?.name
        )
        const decisions = (placement as PlacementDecision)?.status?.decisions
        if (decisions) {
          decisions.forEach((cluster: { clusterName: string }) => {
            clusterSet.add(cluster.clusterName)
          })
        }
      }
    })
  }
  return Array.from(clusterSet)
}

function getArgoCluster(
  resource: IResource & { spec?: { destination?: { name?: string; server?: string } }; status?: { cluster?: string } },
  clusters: ManagedCluster[],
  hubClusterName: string
): string {
  if (resource.status?.cluster) {
    return resource.status.cluster
  }
  const destination = resource.spec?.destination
  if (
    destination?.name === 'in-cluster' ||
    destination?.name === hubClusterName ||
    destination?.server === 'https://kubernetes.default.svc'
  ) {
    return hubClusterName
  }
  return getArgoDestinationCluster(
    destination ?? { namespace: '' },
    clusters,
    resource.status?.cluster,
    hubClusterName,
    [] as Service[]
  )
}
export function getApplicationClusters(
  resource: IResource,
  type: string,
  subscriptions: IResource[],
  placementDecisions: IResource[],
  hubClusterName: string,
  clusters: ManagedCluster[] = []
): string[] {
  switch (type) {
    case 'flux':
    case 'openshift':
    case 'openshift-default':
      if (
        typeof resource === 'object' &&
        resource !== null &&
        'status' in resource &&
        resource.status &&
        typeof resource.status === 'object' &&
        'cluster' in resource.status
      ) {
        return [(resource.status as { cluster?: string }).cluster].filter(Boolean) as string[]
      }
      break
    case 'argo':
      if ('spec' in resource) {
        return [getArgoCluster(resource as any, clusters, hubClusterName)]
      }
      break
    case 'subscription':
      return getSubscriptionCluster(resource, subscriptions, placementDecisions)
  }
  return [hubClusterName]
}

const fluxAnnotations = {
  helm: ['helm.toolkit.fluxcd.io/name', 'helm.toolkit.fluxcd.io/namespace'],
  git: ['kustomize.toolkit.fluxcd.io/name', 'kustomize.toolkit.fluxcd.io/namespace'],
}

export function getApplicationType(resource: IResource) {
  if (resource.apiVersion === 'app.k8s.io/v1beta1') {
    if (resource.kind === 'Application') {
      return 'subscription'
    }
  } else if (resource.apiVersion === 'argoproj.io/v1alpha1') {
    if (resource.kind === 'Application') {
      return 'argo'
    } else if (resource.kind === 'ApplicationSet') {
      return 'appset'
    }
  } else if ('label' in resource) {
    const isFlux = isFluxApplication(resource?.label as string)
    if (isFlux) {
      return 'flux'
    } else if (isSystemApp(resource.metadata?.namespace)) {
      return 'openshift-default'
    }
    return 'openshift'
  }
  return '-'
}

function isFluxApplication(label: string) {
  let isFlux = false
  Object.entries(fluxAnnotations).forEach(([, values]) => {
    const [nameAnnotation, namespaceAnnotation] = values
    if (label.includes(nameAnnotation) && label.includes(namespaceAnnotation)) {
      isFlux = true
    }
  })
  return isFlux
}

function isSystemApp(namespace?: string) {
  return namespace?.startsWith('openshift-')
}
export default getApplication
