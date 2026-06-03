import { expect } from '@playwright/test';

import { PLACEMENT_CLUSTER_PREVIEW } from '@constants/placement-preview';
import type { CreatePolicySetWizardPage } from '@pages/governance/CreatePolicySetWizardPage';

export {
  verifyPlacementPreviewLinkShowsCounts,
  verifyPlacementPreviewModal,
  verifyReviewPlacementPreviewInfoAlert,
  type PlacementPreviewCounts,
} from '@lib/placement/placement-preview-verify';

export { verifyCreatePolicySetWizardTitle } from '@lib/governance/policy-set-create-verify';

export async function verifyReviewPlacementPreviewWhenPresent(
  wizard: CreatePolicySetWizardPage
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
  wizard: CreatePolicySetWizardPage
): Promise<void> {
  await expect(wizard.getNoClustersMatchWarningAlert().first()).toBeVisible({
    timeout: 30_000,
  });
}
