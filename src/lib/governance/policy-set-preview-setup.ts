import type { PlacementPreviewSetupPayload } from '@config';
import type { OcCliService } from '@services/OcCliService';
import {
  applyPlacementPreviewSetup,
  cleanupPlacementPreviewSetup,
  labelClustersForPlacementPreview,
} from '@lib/placement/placement-preview-setup';

export async function applyPolicySetPlacementPreviewSetup(
  oc: OcCliService,
  setup: Pick<PlacementPreviewSetupPayload, 'setupYamlRelativePath'>
): Promise<void> {
  await applyPlacementPreviewSetup(oc, setup);
}

export async function labelClustersForPolicySetPlacementPreview(
  oc: OcCliService,
  clusterNames: string[],
  clusterSet: string
): Promise<void> {
  await labelClustersForPlacementPreview(oc, clusterNames, clusterSet);
}

export async function cleanupPolicySetPlacementPreviewSetup(
  oc: OcCliService,
  setup: Pick<PlacementPreviewSetupPayload, 'setupYamlRelativePath'>
): Promise<void> {
  await cleanupPlacementPreviewSetup(oc, setup);
}
