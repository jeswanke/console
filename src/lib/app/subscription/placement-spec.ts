/**
 * Placement **ClusterDeployment** specs for subscription wizard blocks.
 */
import type { ClusterDeploymentSpec } from './types';

export type ClusterLabelDeploymentParams = {
  /** Cluster sets menu value (default `global`, matches e2e-spec `placement_label_local`). */
  clusterSet?: string;
  labelName?: string;
  labelValues: string[];
  useExistingPlacementRule?: boolean;
};

/**
 * Label-selector placement block for the subscription wizard (Cypress cluster deployment section).
 */
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

/**
 * **Global** cluster set + `name` label selecting `local-cluster` and a managed cluster (Cypress `editDeployOnAll`).
 */
export function buildGlobalClusterLabelDeployment(managedClusterName: string): ClusterDeploymentSpec {
  return buildClusterLabelDeployment({
    clusterSet: 'global',
    labelName: 'name',
    labelValues: ['local-cluster', managedClusterName],
  });
}
