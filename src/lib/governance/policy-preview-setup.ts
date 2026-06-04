import type { PlacementPreviewSetupPayload } from '@config';
import type { OcCliService } from '@services/OcCliService';
import {
  applyPlacementPreviewSetup,
  cleanupPlacementPreviewSetup,
  labelClustersForPlacementPreview,
} from '@lib/placement/placement-preview-setup';

export async function applyPolicyPlacementPreviewSetup(
  oc: OcCliService,
  setup: Pick<PlacementPreviewSetupPayload, 'setupYamlRelativePath'>
): Promise<void> {
  await applyPlacementPreviewSetup(oc, setup);
}

export async function labelClustersForPolicyPreviewTest(
  oc: OcCliService,
  clusterNames: string[],
  clusterSet: string
): Promise<void> {
  await labelClustersForPlacementPreview(oc, clusterNames, clusterSet);
}

export async function cleanupPolicyPlacementPreviewSetup(
  oc: OcCliService,
  setup: Pick<PlacementPreviewSetupPayload, 'setupYamlRelativePath'>
): Promise<void> {
  await cleanupPlacementPreviewSetup(oc, setup);
}
