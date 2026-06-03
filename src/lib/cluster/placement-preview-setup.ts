import path from 'path';

import { PLACEMENT_CREATE_PREVIEW } from '@constants/placement-preview';
import type { OcCliService } from '@services/OcCliService';

const SETUP_YAML_PATH = path.join(
  path.resolve(__dirname, '../../..'),
  PLACEMENT_CREATE_PREVIEW.setupYamlRelativePath
);

const CLUSTER_SET_LABEL = 'cluster.open-cluster-management.io/clusterset';

export async function applyPlacementCreatePreviewSetup(oc: OcCliService): Promise<void> {
  await oc.applyYaml(SETUP_YAML_PATH);
}

export async function labelClustersForPlacementCreatePreview(
  oc: OcCliService,
  clusterNames: string[]
): Promise<void> {
  const clusterSet = PLACEMENT_CREATE_PREVIEW.clusterSet;
  for (const name of clusterNames) {
    await oc.run(
      `oc label managedcluster ${name} ${CLUSTER_SET_LABEL}=${clusterSet} --overwrite`
    );
  }
}
