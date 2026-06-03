import type { PlacementPreviewSetupPayload } from '@config';
import type { OcCliService } from '@services/OcCliService';
import {
  applyPlacementPreviewSetup,
  labelClustersForPlacementPreview,
} from '@lib/placement/placement-preview-setup';

export async function applyPlacementCreatePreviewSetup(
  oc: OcCliService,
  setup: Pick<PlacementPreviewSetupPayload, 'setupYamlRelativePath'>
): Promise<void> {
  await applyPlacementPreviewSetup(oc, setup);
}

export async function labelClustersForPlacementCreatePreview(
  oc: OcCliService,
  clusterNames: string[],
  clusterSet: string
): Promise<void> {
  await labelClustersForPlacementPreview(oc, clusterNames, clusterSet);
}
