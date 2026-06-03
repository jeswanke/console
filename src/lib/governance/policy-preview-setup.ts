import path from 'path';

import { POLICY_PLACEMENT_PREVIEW } from '@constants/governance';
import type { OcCliService } from '@services/OcCliService';

const SETUP_YAML_PATH = path.join(
  path.resolve(__dirname, '../../..'),
  POLICY_PLACEMENT_PREVIEW.setupYamlRelativePath
);

const CLUSTER_SET_LABEL = 'cluster.open-cluster-management.io/clusterset';

/** Apply namespace, ManagedClusterSet, binding, and existing Placement for preview E2E. */
export async function applyPolicyPlacementPreviewSetup(oc: OcCliService): Promise<void> {
  await oc.applyYaml(SETUP_YAML_PATH);
}

/** Assign managed clusters to the test cluster set (requires at least local-cluster). */
export async function labelClustersForPolicyPreviewTest(
  oc: OcCliService,
  clusterNames: string[]
): Promise<void> {
  const clusterSet = POLICY_PLACEMENT_PREVIEW.clusterSet;
  for (const name of clusterNames) {
    await oc.run(
      `oc label managedcluster ${name} ${CLUSTER_SET_LABEL}=${clusterSet} --overwrite`
    );
  }
}

export async function cleanupPolicyPlacementPreviewSetup(oc: OcCliService): Promise<void> {
  await oc.deleteYaml(SETUP_YAML_PATH).catch(() => undefined);
}
