import type { OcCliService } from '@services/OcCliService';
import { withManagedClusterContext } from '@lib/cluster/managed-cluster-oc';

/** Create and label the Argo-managed destination namespace on a managed cluster. */
export async function setupArgoPullDestinationNamespace(
  oc: OcCliService,
  managedClusterName: string,
  destinationNamespace: string
): Promise<void> {
  await withManagedClusterContext(oc, managedClusterName, async () => {
    await oc.createNamespaceIfNotExists(destinationNamespace);
    await oc.run(
      `oc label namespace ${destinationNamespace} argocd.argoproj.io/managed-by=openshift-gitops --overwrite`
    );
  });
}
