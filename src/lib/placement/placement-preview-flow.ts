/**
 * Composable placement-preview scenario steps and shared flow runners.
 *
 * Flow matrix (new placement):
 * - RHACM4K-64219 Argo pull: limit on placement → review@1 → limit 0 (footer only) → review warning
 * - RHACM4K-64220 Create placement: baseline → review@baseline → limit 1 → review@1 → limit 0 → review warning
 * - RHACM4K-64221/64222 Policy / Policy set: same as Argo pull but modal also at limit 0
 */
import { expect, type Locator } from '@playwright/test';

import {
  readPlacementPreviewCountsFromFooter,
  shouldExpectPlacementPreviewSplitSections,
  type PlacementPreviewCounts,
  type PlacementPreviewWizardHost,
  verifyNoClustersMatchWarningInSection,
  verifyPlacementPreviewLinkShowsCounts,
  verifyPlacementPreviewModal,
  verifyReviewPlacementPreviewInfoAlert,
} from '@lib/placement/placement-preview-verify';

export { readPlacementPreviewCountsFromFooter, type PlacementPreviewCounts };

export type PlacementPreviewFlowHost = PlacementPreviewWizardHost & {
  getReviewPlacementSection(): Locator;
  getReviewInfoPlacementPreviewAlert(): Locator;
};

export type NewPlacementPreviewHost = PlacementPreviewFlowHost & {
  setPlacementLimitEnabled(enabled: boolean): Promise<void>;
  setPlacementLimitValue(value: number): Promise<void>;
  decrementPlacementLimit(): Promise<void>;
  advanceToReviewStep(): Promise<void>;
  clickWizardStep(step: 'placement'): Promise<void>;
  selectClusterSet(clusterSet: string): Promise<void>;
};

export type GovernancePlacementPreviewHost = NewPlacementPreviewHost & {
  ensureNewPlacementSelected(): Promise<void>;
};

export type PlacementCreatePreviewHost = NewPlacementPreviewHost & {
  expandReviewPlacementSection(): Promise<void>;
};

export type ArgoPullPlacementPreviewHost = GovernancePlacementPreviewHost & {
  expandReviewPlacementSection(): Promise<void>;
};

export function limitOneCounts(baseline: PlacementPreviewCounts): PlacementPreviewCounts {
  return { matched: 1, total: baseline.total };
}

export function limitZeroCounts(baseline: PlacementPreviewCounts): PlacementPreviewCounts {
  return { matched: 0, total: baseline.total };
}

/** Footer link + optional modal for the given matched/total counts. */
export async function verifyPlacementPreviewAtCounts(
  wizard: PlacementPreviewWizardHost,
  counts: PlacementPreviewCounts,
  options?: { verifyModal?: boolean }
): Promise<void> {
  await verifyPlacementPreviewLinkShowsCounts(wizard, counts);
  if (options?.verifyModal !== false) {
    await verifyPlacementPreviewModal(wizard, {
      expectedCounts: counts,
      expectSplitSections: shouldExpectPlacementPreviewSplitSections(counts),
    });
  }
}

export async function verifyReviewPlacementPreviewAtCounts(
  host: PlacementPreviewFlowHost,
  counts: PlacementPreviewCounts
): Promise<void> {
  await verifyReviewPlacementPreviewInfoAlert(
    () => host.getReviewInfoPlacementPreviewAlert(),
    counts
  );
}

export async function verifyReviewPlacementPreviewWhenPresent(
  host: PlacementPreviewFlowHost,
  counts?: PlacementPreviewCounts
): Promise<void> {
  const infoAlert = host.getReviewInfoPlacementPreviewAlert();
  if ((await infoAlert.count()) === 0) {
    return;
  }
  await verifyReviewPlacementPreviewInfoAlert(() => infoAlert, counts);
}

export async function verifyReviewNoClustersMatchAndNoInfoAlert(
  host: PlacementPreviewFlowHost
): Promise<void> {
  await verifyNoClustersMatchWarningInSection(host.getReviewPlacementSection());
  await expect(host.getReviewInfoPlacementPreviewAlert()).toHaveCount(0);
}

/** RHACM4K-64221 / RHACM4K-64222 — after wizard is on Placement with namespace/details filled. */
export async function runGovernanceNewPlacementPreviewScenarios(
  wizard: GovernancePlacementPreviewHost,
  clusterSet: string
): Promise<void> {
  await wizard.ensureNewPlacementSelected();
  await wizard.setPlacementLimitEnabled(false);
  await wizard.selectClusterSet(clusterSet);

  const baseline = await readPlacementPreviewCountsFromFooter(wizard);
  await verifyPlacementPreviewAtCounts(wizard, baseline);

  await wizard.setPlacementLimitEnabled(true);
  await wizard.setPlacementLimitValue(1);
  const limitOne = limitOneCounts(baseline);
  await verifyPlacementPreviewAtCounts(wizard, limitOne);

  await wizard.advanceToReviewStep();
  await verifyReviewPlacementPreviewAtCounts(wizard, limitOne);

  await wizard.clickWizardStep('placement');
  await wizard.decrementPlacementLimit();
  const limitZero = limitZeroCounts(baseline);
  await verifyPlacementPreviewAtCounts(wizard, limitZero);

  await wizard.advanceToReviewStep();
  await verifyReviewNoClustersMatchAndNoInfoAlert(wizard);
}

/** RHACM4K-64220 — after General fields filled and Placement step is active. */
export async function runPlacementCreatePreviewScenarios(
  wizard: PlacementCreatePreviewHost,
  clusterSet: string
): Promise<void> {
  await wizard.setPlacementLimitEnabled(false);
  await wizard.selectClusterSet(clusterSet);

  const baseline = await readPlacementPreviewCountsFromFooter(wizard);
  await verifyPlacementPreviewAtCounts(wizard, baseline);

  await wizard.advanceToReviewStep();
  await verifyReviewPlacementPreviewAtCounts(wizard, baseline);

  await wizard.clickWizardStep('placement');
  await wizard.setPlacementLimitEnabled(true);
  await wizard.setPlacementLimitValue(1);
  const limitOne = limitOneCounts(baseline);
  await verifyPlacementPreviewAtCounts(wizard, limitOne);

  await wizard.advanceToReviewStep();
  await verifyReviewPlacementPreviewAtCounts(wizard, limitOne);

  await wizard.clickWizardStep('placement');
  await wizard.decrementPlacementLimit();
  const limitZero = limitZeroCounts(baseline);
  await verifyPlacementPreviewAtCounts(wizard, limitZero);

  await wizard.advanceToReviewStep();
  await wizard.expandReviewPlacementSection();
  await verifyReviewNoClustersMatchAndNoInfoAlert(wizard);
}

/** RHACM4K-64219 pull — after fillStepsBeforePlacement; skips modal at zero match. */
export async function runArgoPullNewPlacementPreviewScenarios(
  preview: ArgoPullPlacementPreviewHost,
  clusterSet: string
): Promise<void> {
  await preview.ensureNewPlacementSelected();
  await preview.setPlacementLimitEnabled(false);
  await preview.selectClusterSet(clusterSet);

  const baseline = await readPlacementPreviewCountsFromFooter(preview);
  await verifyPlacementPreviewAtCounts(preview, baseline);

  await preview.setPlacementLimitEnabled(true);
  await preview.setPlacementLimitValue(1);
  const limitOne = limitOneCounts(baseline);
  await verifyPlacementPreviewAtCounts(preview, limitOne);

  await preview.advanceToReviewStep();
  await preview.expandReviewPlacementSection();
  await verifyReviewPlacementPreviewAtCounts(preview, limitOne);

  await preview.clickWizardStep('placement');
  await preview.decrementPlacementLimit();
  const limitZero = limitZeroCounts(baseline);
  await verifyPlacementPreviewAtCounts(preview, limitZero, { verifyModal: false });

  await preview.advanceToReviewStep();
  await preview.expandReviewPlacementSection();
  await verifyReviewNoClustersMatchAndNoInfoAlert(preview);
}
