/**
 * Placement **ClusterDeployment** specs for subscription wizard blocks.
 */
import type { ClusterDeploymentSpec, CreateSubscriptionOptions } from './types';

export type ClusterLabelDeploymentParams = {
  /** Cluster sets menu value (default `global`, matches e2e-spec `placement_label_local`). */
  clusterSet?: string;
  labelName?: string;
  labelValues: string[];
  useExistingPlacementRule?: boolean;
};

/** Label-selector placement block for the subscription wizard. */
export function buildClusterLabelDeployment(
  params: ClusterLabelDeploymentParams
): ClusterDeploymentSpec {
  return {
    useExistingPlacementRule: params.useExistingPlacementRule ?? false,
    useClusterLabelSelector: true,
    clusterSet: params.clusterSet ?? 'global',
    labelSelectorRows: [
      {
        labelName: params.labelName ?? 'name',
        labelValues: params.labelValues,
      },
    ],
  };
}

/** Mirrors e2e-spec **`placement_label_local`** (`name` = `local-cluster`, cluster set `global`). */
export function buildLocalClusterLabelDeployment(): ClusterDeploymentSpec {
  return buildClusterLabelDeployment({
    clusterSet: 'global',
    labelName: 'name',
    labelValues: ['local-cluster'],
  });
}

/** Global cluster set + `name` label for local-cluster and a managed cluster. */
export function buildGlobalClusterLabelDeployment(managedClusterName: string): ClusterDeploymentSpec {
  return buildClusterLabelDeployment({
    clusterSet: 'global',
    labelName: 'name',
    labelValues: ['local-cluster', managedClusterName],
  });
}

/** Managed-cluster-only label placement (Cypress `matchingLabel: true`). */
export function buildManagedClusterLabelDeployment(managedClusterName: string): ClusterDeploymentSpec {
  return buildClusterLabelDeployment({
    clusterSet: 'global',
    labelName: 'name',
    labelValues: [managedClusterName],
  });
}

/** Inject managed-cluster placement into selected repository blocks at runtime. */
export function applyManagedClusterPlacementToBlocks(
  options: CreateSubscriptionOptions,
  managedClusterName: string,
  blockIndices: number | number[]
): CreateSubscriptionOptions {
  const indices = Array.isArray(blockIndices) ? blockIndices : [blockIndices];
  const perBlock = [...(options.perBlock ?? [])];
  const maxIndex = Math.max(...indices, (options.repositories?.length ?? 1) - 1);
  while (perBlock.length <= maxIndex) {
    perBlock.push(undefined);
  }
  for (const index of indices) {
    perBlock[index] = {
      ...perBlock[index],
      clusterDeployment: buildManagedClusterLabelDeployment(managedClusterName),
    };
  }
  return { ...options, perBlock };
}
