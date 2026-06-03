import { expect } from '@playwright/test';

import { PLACEMENT_CLUSTER_PREVIEW } from '@constants/placement-preview';
import type { CreatePolicyWizardPage } from '@pages/governance/CreatePolicyWizardPage';

export {
  parsePlacementPreviewCounts,
  verifyPlacementPreviewLinkShowsCounts,
  verifyPlacementPreviewModal,
  verifyReviewPlacementPreviewInfoAlert,
  type PlacementPreviewCounts,
} from '@lib/placement/placement-preview-verify';

export async function verifyReviewPlacementPreviewWhenPresent(
  wizard: CreatePolicyWizardPage
): Promise<void> {
  const infoAlert = wizard.getReviewInfoPlacementPreviewAlert();
  if ((await infoAlert.count()) === 0) {
    return;
  }
  await expect(infoAlert.first()).toBeVisible();
  await expect(
    infoAlert.first().getByRole('button', {
      name: PLACEMENT_CLUSTER_PREVIEW.footer.previewLinkPattern,
    })
  ).toBeVisible();
}

export async function verifyNoClustersMatchWarningVisible(
  wizard: CreatePolicyWizardPage
): Promise<void> {
  await expect(wizard.getNoClustersMatchWarningAlert().first()).toBeVisible({
    timeout: 30_000,
  });
}
