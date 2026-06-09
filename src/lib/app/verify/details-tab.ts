/** Subscription app **Details** tab assertions (caller must open Details first). */

import { expect, type Locator, type Page } from '@playwright/test';

import { APP_APPLICATION_DETAILS } from '@constants/app';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';

import { expectApplicationDetailsUrl, expectOpenShiftShellTitle } from '../topology/graph-ids';

/** Details **Clusters** value patterns: `Local`, `{n} Remote`, or `{n} Remote, 1 Local`. */
export type SubscriptionDetailsClustersSummary =
  | { variant: 'localOnly' }
  | { variant: 'remoteOnly'; remoteCount: number }
  | { variant: 'localAndRemote'; remoteCount: number };

/** One expected row under the Details tab **Repository** value block. */
export type SubscriptionDetailsRepositoryExpectation = {
  /** Repository URL from spec data; Details may omit a trailing `.git`. */
  url: string;
  /** Optional repository type badge/button label (for example: `Git`, `Helm`). */
  kindLabel?: string;
};

type SubscriptionDetailsRepositorySource = {
  url: string;
  kind: keyof typeof APP_APPLICATION_DETAILS.repositoryKindLabels;
};

type ApplicationExpectationsDetailsHints = {
  detailsClustersSummary?: SubscriptionDetailsClustersSummary;
};

const NON_EMPTY_TEXT_RE = /\S/;

function repositoryKindLabelForDetails(
  kind: SubscriptionDetailsRepositorySource['kind']
): (typeof APP_APPLICATION_DETAILS.repositoryKindLabels)[SubscriptionDetailsRepositorySource['kind']] {
  return APP_APPLICATION_DETAILS.repositoryKindLabels[kind];
}

function buildExpectedDetailsRepositories(
  repositories: ReadonlyArray<SubscriptionDetailsRepositorySource>
): SubscriptionDetailsRepositoryExpectation[] {
  return repositories.map((r) => ({
    url: r.url,
    kindLabel: repositoryKindLabelForDetails(r.kind),
  }));
}

/** Any non-empty digit run in **Cluster resource status** (single-subscription default). */
export function subscriptionDetailsClusterResourceStatusAnyPattern(): RegExp {
  return /\d+/;
}

/** Exact total for **Cluster resource status** when the UI shows a single aggregate count (trimmed). */
export function subscriptionDetailsClusterResourceTotalPattern(expectedCount: number): RegExp {
  return new RegExp(`^\\s*${expectedCount}\\s*$`);
}

/** Details **Cluster resource status** green label count ≥ `minCount`. */
export async function expectApplicationDetailsMinSuccessResourceCount(
  detailsPage: ApplicationDetailsPage,
  minCount: number,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 300_000;
  const statusValue = await expectClusterResourceStatusVisible(detailsPage, timeout);

  await expect
    .poll(
      async () => largestNumericLabelInClusterResourceStatus(statusValue),
      {
        timeout,
        intervals: [5_000, 10_000, 15_000],
        message: `Cluster resource status success count ≥ ${minCount}`,
      }
    )
    .toBeGreaterThanOrEqual(minCount);
}

/** Details **Cluster resource status** green label count ≤ `maxCount` (RHACM4K-7513 broken commit). */
export async function expectApplicationDetailsMaxSuccessResourceCount(
  detailsPage: ApplicationDetailsPage,
  maxCount: number,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 300_000;
  const statusValue = await expectClusterResourceStatusVisible(detailsPage, timeout);

  await expect
    .poll(
      async () => largestNumericLabelInClusterResourceStatus(statusValue),
      {
        timeout,
        intervals: [5_000, 10_000, 15_000],
        message: `Cluster resource status success count ≤ ${maxCount}`,
      }
    )
    .toBeLessThanOrEqual(maxCount);
}

async function expectClusterResourceStatusVisible(
  detailsPage: ApplicationDetailsPage,
  timeout: number
): Promise<Locator> {
  await detailsPage.expectDetailTabSelected('details', { timeout });
  const statusValue = detailsPage.getDescriptionValue('clusterResourceStatus');
  await expect(statusValue).toBeVisible({ timeout });
  return statusValue;
}

async function largestNumericLabelInClusterResourceStatus(statusValue: Locator): Promise<number> {
  let max = 0;

  // PF6: `.pf-m-green` → `c-label__text` or `c-label__content`.
  const greenLabels = statusValue.locator(
    '.pf-m-green [class*="c-label__content"], .pf-m-green [class*="c-label__text"]'
  );
  for (const el of await greenLabels.all()) {
    max = Math.max(max, parseStatusLabelCount(await el.innerText()));
  }

  for (const item of await statusValue.getByRole('listitem').all()) {
    max = Math.max(max, parseStatusLabelCount(await item.innerText()));
  }

  const cellText = await statusValue.innerText().catch(() => '');
  for (const match of cellText.match(/\d+/g) ?? []) {
    max = Math.max(max, parseInt(match, 10));
  }

  return max;
}

function parseStatusLabelCount(text: string): number {
  const n = parseInt(text.trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Playwright `toHaveText` matcher for {@link SubscriptionDetailsClustersSummary} (allows minor whitespace). */
export function subscriptionDetailsClustersValuePattern(
  summary: SubscriptionDetailsClustersSummary
): RegExp {
  switch (summary.variant) {
    case 'localOnly':
      return /^\s*Local\s*$/i;
    case 'remoteOnly':
      return new RegExp(`^\\s*${summary.remoteCount}\\s+Remote\\s*$`, 'i');
    case 'localAndRemote':
      return new RegExp(
        `^\\s*${summary.remoteCount}\\s+Remote,\\s*1\\s+Local\\s*$`,
        'i'
      );
  }
}

function countByText(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

/** Console Details often omits a trailing `.git` on Git repository URLs. */
export function normalizeSubscriptionDetailsRepositoryUrl(url: string): string {
  return url.trim().replace(/\.git$/i, '');
}

function repositoryUrlDisplayedPattern(url: string): RegExp {
  const normalized = normalizeSubscriptionDetailsRepositoryUrl(url);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped);
}

async function waitForRepositoryUrlOccurrences(
  repositoryValue: Locator,
  url: string,
  expectedCount: number,
  options: { timeout?: number }
): Promise<void> {
  const pattern = repositoryUrlDisplayedPattern(url);
  const timeout = options.timeout ?? 30_000;
  await expect
    .poll(
      async () => {
        const text = await repositoryValue.innerText().catch(() => '');
        const matches = text.match(new RegExp(pattern.source, 'g'));
        return (matches?.length ?? 0) === expectedCount;
      },
      {
        timeout,
        intervals: [1_000, 2_000, 3_000, 5_000],
        message: `Expected Repository value to show URL ${url} × ${expectedCount}`,
      }
    )
    .toBe(true);
}

async function waitForLocatorTextMatch(
  locator: Locator,
  matcher: RegExp,
  options: { timeout: number; label: string }
): Promise<void> {
  await expect(locator).toBeVisible({ timeout: options.timeout });
  await expect
    .poll(
      async () => {
        const text = await locator.innerText().catch(() => '');
        return matcher.test(text);
      },
      {
        timeout: options.timeout,
        intervals: [1_000, 2_000, 3_000, 5_000],
        message: `Expected Details field "${options.label}" to match ${matcher}`,
      }
    )
    .toBe(true);
}

async function assertRepositoryValue(
  repositoryValue: Locator,
  expectedRepositories: SubscriptionDetailsRepositoryExpectation[] | undefined,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout;
  await expect(repositoryValue).toBeVisible();
  await expect(repositoryValue).toHaveText(NON_EMPTY_TEXT_RE);

  if (!expectedRepositories?.length) return;

  const urlCounts = countByText(expectedRepositories.map((r) => r.url));
  for (const [url, count] of urlCounts) {
    await waitForRepositoryUrlOccurrences(repositoryValue, url, count, { timeout });
  }

  const kindCounts = countByText(
    expectedRepositories.flatMap((r) => (r.kindLabel ? [r.kindLabel] : []))
  );
  for (const [kindLabel, count] of kindCounts) {
    await expect(repositoryValue.getByRole('button', { name: kindLabel, exact: true })).toHaveCount(count, {
      timeout,
    });
  }
}

export type VerifySubscriptionAppDetailsTabParams = {
  page: Page;
  detailsPage: ApplicationDetailsPage;
  applicationName: string;
  namespace: string;
  /** Override e2e-spec `detailsClustersSummary`. */
  clustersSummary?: SubscriptionDetailsClustersSummary;
  applicationExpectations?: ApplicationExpectationsDetailsHints;
  expectedRepositories?: SubscriptionDetailsRepositoryExpectation[];
  repositories?: ReadonlyArray<SubscriptionDetailsRepositorySource>;
  detailsUrlTimeout?: number;
  detailsValuesTimeout?: number;
  /** Multi-subscription CRS reflects `#comboChannel`; default any digit. */
  clusterResourceStatusPattern?: RegExp;
};

function resolveDetailsClustersSummary(
  params: VerifySubscriptionAppDetailsTabParams
): SubscriptionDetailsClustersSummary | undefined {
  const fromConfig = params.applicationExpectations?.detailsClustersSummary;
  if (params.clustersSummary) return params.clustersSummary;
  if (fromConfig) return fromConfig;
  return undefined;
}

/** Asserts Details URL, tab, h1, and DescriptionList fields. Does not navigate. */
export async function verifySubscriptionAppDetailsTab(
  params: VerifySubscriptionAppDetailsTabParams
): Promise<void> {
  const {
    page,
    detailsPage,
    applicationName,
    namespace,
    expectedRepositories,
    repositories,
    detailsUrlTimeout = 120_000,
    detailsValuesTimeout = 120_000,
    clusterResourceStatusPattern,
  } = params;
  const clustersSummary = resolveDetailsClustersSummary(params);
  const expectedRepositoriesResolved =
    expectedRepositories ?? (repositories ? buildExpectedDetailsRepositories(repositories) : undefined);

  await expectOpenShiftShellTitle(page);
  await expectApplicationDetailsUrl(page, namespace, applicationName, {
    timeout: detailsUrlTimeout,
  });
  await detailsPage.expectDetailTabSelected('details', { timeout: detailsUrlTimeout });
  await expect(detailsPage.getApplicationHeading()).toHaveText(applicationName);
  await expect(detailsPage.getDescriptionValue('name')).toHaveText(applicationName);
  await expect(detailsPage.getDescriptionValue('namespace')).toHaveText(namespace);
  await expect(detailsPage.getDescriptionValue('type')).toContainText(
    APP_APPLICATION_DETAILS.typeValues.subscription
  );
  const repositoryValue = detailsPage.getDescriptionValue('repository');
  await assertRepositoryValue(repositoryValue, expectedRepositoriesResolved, {
    timeout: detailsValuesTimeout,
  });

  await expect(detailsPage.getDescriptionTerm('clusters')).toBeVisible();
  const clustersValue = detailsPage.getDescriptionValue('clusters');
  if (clustersSummary) {
    await waitForLocatorTextMatch(clustersValue, subscriptionDetailsClustersValuePattern(clustersSummary), {
      timeout: detailsValuesTimeout,
      label: 'Clusters',
    });
  } else {
    await waitForLocatorTextMatch(clustersValue, NON_EMPTY_TEXT_RE, {
      timeout: detailsValuesTimeout,
      label: 'Clusters',
    });
  }

  await expect(detailsPage.getDescriptionTerm('clusterResourceStatus')).toBeVisible();
  const clusterResourceStatusValue = detailsPage.getDescriptionValue('clusterResourceStatus');
  const crsPattern =
    clusterResourceStatusPattern ?? subscriptionDetailsClusterResourceStatusAnyPattern();
  await waitForLocatorTextMatch(clusterResourceStatusValue, crsPattern, {
    timeout: detailsValuesTimeout,
    label: 'Cluster resource status',
  });

  await expect(detailsPage.getDescriptionTerm('created')).toBeVisible();
  const createdValue = detailsPage.getDescriptionValue('created');
  await expect(createdValue).toBeVisible();
  await expect(createdValue).toHaveText(NON_EMPTY_TEXT_RE);

  await expect(detailsPage.getDescriptionTerm('lastSyncRequested')).toBeVisible();
  const lastSyncRequestedValue = detailsPage.getDescriptionValue('lastSyncRequested');
  await expect(lastSyncRequestedValue).toBeVisible({ timeout: detailsValuesTimeout });
  await expect(lastSyncRequestedValue).toContainText('-', { timeout: detailsValuesTimeout });
  const syncLink = lastSyncRequestedValue.locator(`a#${APP_APPLICATION_DETAILS.syncActionAnchorId}`);
  await expect(syncLink).toBeVisible({
    timeout: detailsValuesTimeout,
  });
  await expect(syncLink).toHaveText('Sync');
}
