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

export async function labelClustersForPlacementPreview(
  oc: OcCliService,
  clusterNames: string[],
  clusterSet: string
): Promise<void> {
  for (const name of clusterNames) {
    await oc.run(
      `oc label managedcluster ${name} ${CLUSTER_SET_LABEL}=${clusterSet} --overwrite`
    );
  }
}
