import type { OcCliService } from '@services/OcCliService';

import type { CreateArgoPushApplicationOptions } from './types';

/**
 * Idempotent pre-test cleanup on the hub Argo server namespace (e.g. `openshift-gitops`):
 * ApplicationSet, then Placement / PlacementDecision CRs for this app. Remote workload namespaces
 * on managed clusters are cleaned separately via {@link OcCliService.deleteNamespaceOnManagedClusters}.
 */
export async function cleanupArgoPushApplication(
  oc: OcCliService,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const {
    applicationName,
    argoServerLabel: argoServerNamespace,
    destinationNamespace,
    clusterSet,
  } = options;

  await oc.deleteApplicationSet(argoServerNamespace, applicationName);
  await oc.deleteApplicationPlacementsInNamespace(argoServerNamespace, applicationName);

  const managedClusters = await oc.listManagedClusterNamesInClusterSet(clusterSet);
  await oc.deleteNamespaceOnManagedClusters(destinationNamespace, managedClusters);
}
