import { expect, type Locator } from '@playwright/test';

import { PLACEMENT_CLUSTER_PREVIEW } from '@constants/placement-preview';

/** Footer link reflects placement predicates/limits — not raw ManagedClusterSet membership. */
export async function readPlacementPreviewCountsFromFooter(
  wizard: PlacementPreviewWizardHost
): Promise<PlacementPreviewCounts> {
  const link = wizard.getPlacementPreviewLink();
  await expect(link).toBeVisible({ timeout: 60_000 });
  const counts = parsePlacementPreviewCounts(await link.innerText());
  expect(counts).not.toBeNull();
  return counts!;
}

export type PlacementPreviewCounts = {
  matched: number;
  total: number;
};

/** Split "Matched" / "Not matched" sections only when some (not all, not zero) clusters match. */
export function shouldExpectPlacementPreviewSplitSections(
  counts: PlacementPreviewCounts
): boolean {
  return counts.matched > 0 && counts.matched < counts.total;
}

export type PlacementPreviewWizardHost = {
  getPlacementMatchSummary(): Locator;
  getPlacementPreviewLink(): Locator;
  getPlacementPreviewModal(): Locator;
  openPlacementPreviewModal(): Promise<void>;
  closePlacementPreviewModal(): Promise<void>;
};

/** Parse footer link text like `2 of 2 clusters` or `1 cluster`. */
export function parsePlacementPreviewCounts(text: string): PlacementPreviewCounts | null {
  const ofMatch = text.match(/(\d+)\s+of\s+(\d+)\s+clusters?/i);
  if (ofMatch) {
    return { matched: Number(ofMatch[1]), total: Number(ofMatch[2]) };
  }
  const simple = text.match(/(\d+)\s+clusters?/i);
  if (simple) {
    const n = Number(simple[1]);
    return { matched: n, total: n };
  }
  return null;
}

/** Parse modal h1: `2 of 3 clusters matched`, `2 clusters matched`, or `1 cluster matched` (ACM-33680). */
export function parsePlacementPreviewModalTitle(text: string): PlacementPreviewCounts | null {
  const ofMatch = text.match(/(\d+)\s+of\s+(\d+)\s+clusters?\s+matched/i);
  if (ofMatch) {
    return { matched: Number(ofMatch[1]), total: Number(ofMatch[2]) };
  }
  const simple = text.match(/(\d+)\s+clusters?\s+matched/i);
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
    const titleCounts = parsePlacementPreviewModalTitle(title);
    expect(
      titleCounts,
      `Could not parse placement preview modal title: ${JSON.stringify(title)}`
    ).not.toBeNull();
    expect(titleCounts).toEqual(options.expectedCounts);
  }

  if (options.expectMatchedClusters?.length) {
    await expect(
      modal.getByRole('heading', {
        name: PLACEMENT_CLUSTER_PREVIEW.previewModal.matchedSectionLabel,
      })
    ).toBeVisible();
    for (const cluster of options.expectMatchedClusters) {
      await expect(modal.getByText(cluster, { exact: true })).toBeVisible();
    }
  }

  if (options.expectSplitSections) {
    await expect(
      modal.getByRole('heading', {
        name: PLACEMENT_CLUSTER_PREVIEW.previewModal.matchedSectionLabel,
      })
    ).toBeVisible();
    await expect(
      modal.getByRole('heading', {
        name: PLACEMENT_CLUSTER_PREVIEW.previewModal.notMatchedSectionLabel,
      })
    ).toBeVisible();
  }

  if (options.expectNotMatchedClusters?.length) {
    await expect(
      modal.getByRole('heading', {
        name: PLACEMENT_CLUSTER_PREVIEW.previewModal.notMatchedSectionLabel,
      })
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

/** PF6 review warning — inline Alert may not map to role=alert; match alert chrome or message text. */
export function getNoClustersMatchWarningInSection(section: Locator): Locator {
  const message = PLACEMENT_CLUSTER_PREVIEW.alerts.noClustersMatchWarning;
  return section
    .locator('.pf-v6-c-alert.pf-m-warning, .pf-v6-c-alert.pf-m-danger')
    .filter({ hasText: message })
    .or(section.getByRole('alert').filter({ hasText: message }))
    .or(section.getByText(message))
    .first();
}

export async function verifyNoClustersMatchWarningInSection(
  section: Locator
): Promise<void> {
  await expect(getNoClustersMatchWarningInSection(section)).toBeVisible({
    timeout: 30_000,
  });
}
