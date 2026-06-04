import path from 'path';

import type { PlacementPreviewSetupPayload } from '@config';
import type { OcCliService } from '@services/OcCliService';

const CLUSTER_SET_LABEL = 'cluster.open-cluster-management.io/clusterset';

function setupYamlPath(setupYamlRelativePath: string): string {
  return path.join(path.resolve(__dirname, '../../..'), setupYamlRelativePath);
}

export async function applyPlacementPreviewSetup(
  oc: OcCliService,
  setup: Pick<PlacementPreviewSetupPayload, 'setupYamlRelativePath'>
): Promise<void> {
  await oc.applyYaml(setupYamlPath(setup.setupYamlRelativePath));
}

export async function cleanupPlacementPreviewSetup(
  oc: OcCliService,
  setup: Pick<PlacementPreviewSetupPayload, 'setupYamlRelativePath'>
): Promise<void> {
  await oc.deleteYaml(setupYamlPath(setup.setupYamlRelativePath)).catch(() => undefined);
}

function assertSafeManagedClusterName(name: string): void {
  if (
    !name ||
    name.length > 253 ||
    !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(name)
  ) {
    throw new Error(
      `labelClustersForPlacementPreview: invalid cluster name (${JSON.stringify(name)})`
    );
  }
}

function assertSafeClusterSet(clusterSet: string): void {
  const set = clusterSet.trim();
  if (!set || set.length > 63 || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(set)) {
    throw new Error(
      `labelClustersForPlacementPreview: invalid clusterSet (${JSON.stringify(clusterSet)})`
    );
  }
}

export async function labelClustersForPlacementPreview(
  oc: OcCliService,
  clusterNames: string[],
  clusterSet: string
): Promise<void> {
  assertSafeClusterSet(clusterSet);
  for (const name of clusterNames) {
    assertSafeManagedClusterName(name);
    await oc.labelManagedCluster(name, CLUSTER_SET_LABEL, clusterSet);
  }
}
