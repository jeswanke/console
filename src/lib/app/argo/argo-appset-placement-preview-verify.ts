/** RHACM4K-64219 — Argo ApplicationSet placement preview flows. */
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import { fillOptionsFromArgoPush } from '@lib/app/argo/fill-wizard-before-placement';
import {
  readPlacementPreviewCountsFromFooter,
  runArgoPullNewPlacementPreviewScenarios,
  verifyPlacementPreviewAtCounts,
  verifyReviewPlacementPreviewWhenPresent,
} from '@lib/placement/placement-preview-flow';
import type { ArgoPullApplicationCreateWizardPage } from '@pages/app/ArgoPullApplicationCreateWizardPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';

export async function runArgoPullPlacementPreviewFlow(
  pullWizard: ArgoPullApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const { clusterSet } = options;
  const pullName = options.pullApplicationName ?? options.applicationName;
  const fill = fillOptionsFromArgoPush(options, `${pullName}-${Date.now()}`);

  await pullWizard.fillStepsBeforePlacement(fill);
  await runArgoPullNewPlacementPreviewScenarios(pullWizard.placementPreview, clusterSet);
}

/** Wire from argo-appset-placement-preview.spec.ts when push wizard exposes existing-placement preview. */
export async function runArgoPushExistingPlacementPreviewFlow(
  pushWizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const { applicationName, existingPlacementName } = options;
  if (!existingPlacementName) {
    throw new Error('e2e-spec-data: argoPush.existingPlacementName is required for RHACM4K-64219');
  }
  const fill = fillOptionsFromArgoPush(options, `${applicationName}-${Date.now()}`);
  const preview = pushWizard.placementPreview;

  await pushWizard.fillStepsBeforePlacement(fill);
  await preview.ensureExistingPlacementSelected();
  await preview.selectExistingPlacement(existingPlacementName);

  const baseline = await readPlacementPreviewCountsFromFooter(preview);
  await verifyPlacementPreviewAtCounts(preview, baseline);
  await preview.advanceToReviewStep();
  await preview.expandReviewPlacementSection();
  await verifyReviewPlacementPreviewWhenPresent(preview, baseline);
}
