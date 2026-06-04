/**
 * RHACM4K-64220 — Standalone Create placement wizard placement preview.
 */
import { expect } from '@playwright/test';

import { runPlacementCreatePreviewScenarios } from '@lib/placement/placement-preview-flow';
import type { CreatePlacementWizardPage } from '@pages/cluster/CreatePlacementWizardPage';

export async function verifyCreatePlacementWizardVisible(
  wizard: CreatePlacementWizardPage
): Promise<void> {
  await expect(wizard.getPageTitle()).toBeVisible();
}

export type PlacementCreatePreviewOptions = {
  placementName: string;
  namespace: string;
  clusterSet: string;
};

export async function runPlacementCreatePreviewFlow(
  wizard: CreatePlacementWizardPage,
  options: PlacementCreatePreviewOptions
): Promise<void> {
  const { placementName, namespace, clusterSet } = options;
  await wizard.fillGeneralFields(placementName, namespace);
  await wizard.clickWizardStep('placement');
  await runPlacementCreatePreviewScenarios(wizard, clusterSet);
}
