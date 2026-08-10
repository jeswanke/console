import type { OcCliService } from '@services/OcCliService';

import type { CreateArgoPushApplicationOptions } from './types';

async function deleteArgoPushChildApplications(
  oc: OcCliService,
  argoServerNs: string,
  applicationName: string,
  clusterNames: string[]
): Promise<void> {
  const targets = new Set(clusterNames);
  targets.add('local-cluster');
  for (const clusterName of targets) {
    await oc.deleteArgoCdApplication(argoServerNs, `${applicationName}-${clusterName}`);
  }
}

/**
 * Idempotent pre-test cleanup on the hub Argo server namespace (e.g. `openshift-gitops`):
 * child Argo CD Applications, ApplicationSet, Placement / PlacementDecision CRs, and remote
 * workload namespaces on managed clusters.
 */
export async function cleanupArgoPushApplication(
  oc: OcCliService,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const {
    applicationName,
    argoServerLabel,
    applicationSetNamespace,
    destinationNamespace,
    clusterSet,
  } = options;
  const argoServerNs = applicationSetNamespace ?? argoServerLabel;

  const managedClusters = await oc.listManagedClusterNamesInClusterSet(clusterSet);
  await deleteArgoPushChildApplications(oc, argoServerNs, applicationName, managedClusters);

  await oc.deleteApplicationSet(argoServerNs, applicationName);
  await oc.deleteApplicationPlacementsInNamespace(argoServerNs, applicationName);
  await oc.deleteNamespaceOnManagedClusters(destinationNamespace, managedClusters);
}
