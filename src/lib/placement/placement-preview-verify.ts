import { expect, type Locator } from '@playwright/test';

import { PLACEMENT_CLUSTER_PREVIEW } from '@constants/placement-preview';

export type PlacementPreviewCounts = {
  matched: number;
  total: number;
};

export type PlacementPreviewWizardHost = {
  getPlacementMatchSummary(): Locator;
  getPlacementPreviewLink(): Locator;
  getPlacementPreviewModal(): Locator;
  openPlacementPreviewModal(): Promise<void>;
  closePlacementPreviewModal(): Promise<void>;
};

/** Parse footer/modal text like `2 of 2 clusters` or `2 clusters`. */
export function parsePlacementPreviewCounts(text: string): PlacementPreviewCounts | null {
  const ofMatch = text.match(/(\d+)\s+of\s+(\d+)\s+clusters/i);
  if (ofMatch) {
    return { matched: Number(ofMatch[1]), total: Number(ofMatch[2]) };
  }
  const simple = text.match(/(\d+)\s+clusters/i);
  if (simple) {
    const n = Number(simple[1]);
    return { matched: n, total: n };
  }
  return null;
}

export async function verifyPlacementPreviewLinkShowsCounts(
  wizard: PlacementPreviewWizardHost,
  expected: PlacementPreviewCounts
): Promise<void> {
  const summary = wizard.getPlacementMatchSummary();
  await expect(summary).toBeVisible({ timeout: 60_000 });
  const linkText = await wizard.getPlacementPreviewLink().innerText();
  const counts = parsePlacementPreviewCounts(linkText);
  expect(counts).toEqual(expected);
}

export async function verifyPlacementPreviewModal(
  wizard: PlacementPreviewWizardHost,
  options: {
    expectedCounts?: PlacementPreviewCounts;
    expectMatchedClusters?: string[];
    expectNotMatchedClusters?: string[];
    expectSplitSections?: boolean;
  }
): Promise<void> {
  await wizard.openPlacementPreviewModal();
  const modal = wizard.getPlacementPreviewModal();
  await expect(modal).toBeVisible();

  const title = await modal.locator('h1').first().innerText();
  expect(title).toMatch(PLACEMENT_CLUSTER_PREVIEW.previewModal.titlePattern);
  await expect(modal).toContainText(PLACEMENT_CLUSTER_PREVIEW.previewModal.descriptionPattern);

  if (options.expectedCounts) {
    const titleCounts = parsePlacementPreviewCounts(title);
    if (titleCounts) {
      expect(titleCounts.matched).toBe(options.expectedCounts.matched);
      expect(titleCounts.total).toBe(options.expectedCounts.total);
    }
  }

  if (options.expectMatchedClusters?.length) {
    await expect(
      modal.getByText(PLACEMENT_CLUSTER_PREVIEW.previewModal.matchedSectionLabel)
    ).toBeVisible();
    for (const cluster of options.expectMatchedClusters) {
      await expect(modal.getByText(cluster, { exact: true })).toBeVisible();
    }
  }

  if (options.expectSplitSections) {
    await expect(
      modal.getByText(PLACEMENT_CLUSTER_PREVIEW.previewModal.matchedSectionLabel)
    ).toBeVisible();
    await expect(
      modal.getByText(PLACEMENT_CLUSTER_PREVIEW.previewModal.notMatchedSectionLabel)
    ).toBeVisible();
  }

  if (options.expectNotMatchedClusters?.length) {
    await expect(
      modal.getByText(PLACEMENT_CLUSTER_PREVIEW.previewModal.notMatchedSectionLabel)
    ).toBeVisible();
    for (const cluster of options.expectNotMatchedClusters) {
      await expect(modal.getByText(cluster, { exact: true })).toBeVisible();
    }
  }

  await wizard.closePlacementPreviewModal();
}

export async function verifyReviewPlacementPreviewInfoAlert(
  getInfoAlert: () => Locator,
  expectedCounts?: PlacementPreviewCounts
): Promise<void> {
  const infoAlert = getInfoAlert();
  await expect(infoAlert.first()).toBeVisible({ timeout: 30_000 });
  const link = infoAlert.first().getByRole('button', {
    name: PLACEMENT_CLUSTER_PREVIEW.footer.previewLinkPattern,
  });
  await expect(link).toBeVisible();
  if (expectedCounts) {
    const text = await link.innerText();
    expect(parsePlacementPreviewCounts(text)).toEqual(expectedCounts);
  }
}

export async function verifyNoClustersMatchWarningInSection(
  section: Locator
): Promise<void> {
  await expect(
    section.getByRole('alert').filter({
      hasText: PLACEMENT_CLUSTER_PREVIEW.alerts.noClustersMatchWarning,
    })
  ).toBeVisible({ timeout: 30_000 });
}
