/** Topology graph `data-id` builders for ApplicationSet push-model apps. */

import type { TopologyClusterResourceRef } from './graph-ids';

export function topologyAppSetApplicationDataId(applicationSetName: string): string {
  return `application--${applicationSetName}`;
}

/** Git repo / path node (`helloworld-argo` label; id uses ApplicationSet name). */
export function topologyAppSetRepoDataId(argoServerNamespace: string, applicationSetName: string): string {
  return `member--repo--${argoServerNamespace}--${applicationSetName}`;
}

export function topologyAppSetPlacementDecisionDataId(
  argoServerNamespace: string,
  applicationSetName: string
): string {
  return `member--placement--decision--${argoServerNamespace}--${applicationSetName}`;
}

export function topologyAppSetPlacementDataId(
  argoServerNamespace: string,
  applicationSetName: string
): string {
  return `member--placement--${argoServerNamespace}--${applicationSetName}`;
}

/** Cluster hub node (observed id suffix is empty on push-model hubs). */
export function topologyAppSetClusterHubDataId(): string {
  return 'member--clusters--';
}

function appSetDeployableKindPrefix(clusterName: string, kind: string): string {
  return `member--member--deployable--member--clusters--${clusterName}--${kind}--`;
}

export function topologyAppSetDeployedServiceDataId(
  clusterName: string,
  destinationNamespace: string,
  serviceName: string
): string {
  return `${appSetDeployableKindPrefix(clusterName, 'service')}${destinationNamespace}--${serviceName}`;
}

export function topologyAppSetDeployedDeploymentDataId(
  clusterName: string,
  destinationNamespace: string,
  deploymentName: string
): string {
  return `${appSetDeployableKindPrefix(clusterName, 'deployment')}${destinationNamespace}--${deploymentName}`;
}

export function topologyAppSetDeployedReplicaSetDataId(
  clusterName: string,
  destinationNamespace: string,
  deploymentName: string,
  replicaSetName: string
): string {
  return `${topologyAppSetDeployedDeploymentDataId(clusterName, destinationNamespace, deploymentName)}--replicaset--${replicaSetName}`;
}

export function topologyAppSetDeployedPodDataId(
  clusterName: string,
  destinationNamespace: string,
  deploymentName: string,
  replicaSetName: string,
  podStem: string
): string {
  return `${topologyAppSetDeployedReplicaSetDataId(clusterName, destinationNamespace, deploymentName, replicaSetName)}--pod--${podStem}`;
}

/**
 * Builds push-model ApplicationSet topology **`data-id`** list (ApplicationSet → repo → placement →
 * cluster → deployables). Captured from hub `auto-git-push-private-63608` / `test-api-argo-helm`.
 */
export function buildTopologyNodeDataIdsForAppSetPush(params: {
  applicationSetName: string;
  argoServerNamespace: string;
  destinationNamespace: string;
  clusterName?: string;
  clusterResourceRows: TopologyClusterResourceRef[];
}): string[] {
  const cluster = params.clusterName ?? 'local-cluster';
  const { applicationSetName, argoServerNamespace, destinationNamespace } = params;

  const ids: string[] = [
    topologyAppSetApplicationDataId(applicationSetName),
    topologyAppSetRepoDataId(argoServerNamespace, applicationSetName),
    topologyAppSetPlacementDecisionDataId(argoServerNamespace, applicationSetName),
    topologyAppSetPlacementDataId(argoServerNamespace, applicationSetName),
    topologyAppSetClusterHubDataId(),
  ];

  const deploymentName = params.clusterResourceRows.find(
    (r) => r.kind.toLowerCase() === 'deployment'
  )?.name;
  const replicaSetName = params.clusterResourceRows.find(
    (r) => r.kind.toLowerCase() === 'replicaset'
  )?.name;

  for (const row of params.clusterResourceRows) {
    const k = row.kind.toLowerCase();
    if (k === 'deployment') {
      ids.push(
        topologyAppSetDeployedDeploymentDataId(cluster, destinationNamespace, row.name)
      );
    } else if (k === 'service') {
      ids.push(topologyAppSetDeployedServiceDataId(cluster, destinationNamespace, row.name));
    } else if (k === 'replicaset') {
      if (!deploymentName) {
        throw new Error('appset-topology: ReplicaSet row requires a Deployment row');
      }
      ids.push(
        topologyAppSetDeployedReplicaSetDataId(
          cluster,
          destinationNamespace,
          deploymentName,
          row.name
        )
      );
    } else if (k === 'pod') {
      if (!deploymentName || !replicaSetName) {
        throw new Error('appset-topology: Pod row requires Deployment and ReplicaSet rows');
      }
      ids.push(
        topologyAppSetDeployedPodDataId(
          cluster,
          destinationNamespace,
          deploymentName,
          replicaSetName,
          row.name
        )
      );
    }
  }

  return ids;
}
