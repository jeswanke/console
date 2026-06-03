import { expect } from '@playwright/test';

import type { CreatePlacementWizardPage } from '@pages/cluster/CreatePlacementWizardPage';

export {
  verifyPlacementPreviewLinkShowsCounts,
  verifyPlacementPreviewModal,
  verifyReviewPlacementPreviewInfoAlert,
  verifyNoClustersMatchWarningInSection,
  type PlacementPreviewCounts,
} from '@lib/placement/placement-preview-verify';

export async function verifyCreatePlacementWizardVisible(
  wizard: CreatePlacementWizardPage
): Promise<void> {
  await expect(wizard.getPageTitle()).toBeVisible();
}
