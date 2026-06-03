import path from 'path';

import { POLICY_SET_PLACEMENT_PREVIEW } from '@constants/governance';
import type { OcCliService } from '@services/OcCliService';

const SETUP_YAML_PATH = path.join(
  path.resolve(__dirname, '../../..'),
  POLICY_SET_PLACEMENT_PREVIEW.setupYamlRelativePath
);

const CLUSTER_SET_LABEL = 'cluster.open-cluster-management.io/clusterset';

export async function applyPolicySetPlacementPreviewSetup(oc: OcCliService): Promise<void> {
  await oc.applyYaml(SETUP_YAML_PATH);
}

export async function labelClustersForPolicySetPlacementPreview(
  oc: OcCliService,
  clusterNames: string[]
): Promise<void> {
  const clusterSet = POLICY_SET_PLACEMENT_PREVIEW.clusterSet;
  for (const name of clusterNames) {
    await oc.run(
      `oc label managedcluster ${name} ${CLUSTER_SET_LABEL}=${clusterSet} --overwrite`
    );
  }
}

export async function cleanupPolicySetPlacementPreviewSetup(oc: OcCliService): Promise<void> {
  await oc.deleteYaml(SETUP_YAML_PATH).catch(() => undefined);
}
