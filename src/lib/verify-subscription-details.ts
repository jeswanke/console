/**
 * **Details** tab verification for a subscription application (post–Create redirect, or any visit).
 */

import { expect, type Locator, type Page } from '@playwright/test';

import { APP_APPLICATION_DETAILS } from '@constants/app';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';

import { expectApplicationDetailsUrl, expectOpenShiftShellTitle } from './topology-graph';

/**
 * Expected **Clusters** DescriptionList value on subscription app **Details** (hub wording):
 * - **Local only** (placement only local cluster): `Local`
 * - **Remote only**: `{n} Remote`
 * - **Local + remotes**: `{n} Remote, 1 Local`
 */
export type SubscriptionDetailsClustersSummary =
  | { variant: 'localOnly' }
  | { variant: 'remoteOnly'; remoteCount: number }
  | { variant: 'localAndRemote'; remoteCount: number };

/** One expected row under the Details tab **Repository** value block. */
export type SubscriptionDetailsRepositoryExpectation = {
  /** Full repository URL string shown in Details (exact text). */
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
  expectedRepositories: SubscriptionDetailsRepositoryExpectation[] | undefined
): Promise<void> {
  await expect(repositoryValue).toBeVisible();
  await expect(repositoryValue).toHaveText(NON_EMPTY_TEXT_RE);

  if (!expectedRepositories?.length) return;

  const urlCounts = countByText(expectedRepositories.map((r) => r.url));
  for (const [url, count] of urlCounts) {
    await expect(repositoryValue.getByText(url, { exact: true })).toHaveCount(count);
  }

  const kindCounts = countByText(
    expectedRepositories.flatMap((r) => (r.kindLabel ? [r.kindLabel] : []))
  );
  for (const [kindLabel, count] of kindCounts) {
    await expect(repositoryValue.getByRole('button', { name: kindLabel, exact: true })).toHaveCount(
      count
    );
  }
}

export type VerifySubscriptionAppDetailsTabParams = {
  page: Page;
  detailsPage: ApplicationDetailsPage;
  applicationName: string;
  namespace: string;
  /**
   * Expected **Clusters** cell copy. Prefer **`applicationExpectations.detailsClustersSummary`** from e2e-spec-data;
   * pass this only to override config for a one-off test.
   */
  clustersSummary?: SubscriptionDetailsClustersSummary;
  /**
   * Resolved **`applicationExpectations`** domain hints (currently `detailsClustersSummary`) for Details-tab checks.
   */
  applicationExpectations?: ApplicationExpectationsDetailsHints;
  /**
   * Optional explicit Repository assertions. When set, URLs (and optional kind labels) are checked by exact count.
   * When omitted, only generic non-empty repository content is asserted.
   */
  expectedRepositories?: SubscriptionDetailsRepositoryExpectation[];
  /**
   * Optional source repositories from subscription options (`url` + `kind`); converted internally to expected
   * repository assertions. Ignored when {@link expectedRepositories} is provided.
   */
  repositories?: ReadonlyArray<SubscriptionDetailsRepositorySource>;
  /** Wait for post–Create redirect to **Details** (default 120s). */
  detailsUrlTimeout?: number;
  /** Wait for eventually-populated Details values (Clusters / Cluster resource status). */
  detailsValuesTimeout?: number;
};

function resolveDetailsClustersSummary(
  params: VerifySubscriptionAppDetailsTabParams
): SubscriptionDetailsClustersSummary | undefined {
  const fromConfig = params.applicationExpectations?.detailsClustersSummary;
  if (params.clustersSummary) return params.clustersSummary;
  if (fromConfig) return fromConfig;
  return undefined;
}

/**
 * After **Create**, the console redirects to the application **Details** tab. Asserts URL, shell title,
 * **Details** tab selection, `h1`, and DescriptionList fields (including **Clusters**, **Cluster resource status**,
 * **Created**, **Last sync requested**) before callers open **Topology**.
 */
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
  } = params;
  const clustersSummary = resolveDetailsClustersSummary(params);
  const expectedRepositoriesResolved =
    expectedRepositories ?? (repositories ? buildExpectedDetailsRepositories(repositories) : undefined);

  await expectOpenShiftShellTitle(page);
  await expectApplicationDetailsUrl(page, namespace, applicationName, {
    timeout: detailsUrlTimeout,
  });
  await detailsPage.expectDetailTabSelected('details');
  await expect(detailsPage.getApplicationHeading()).toHaveText(applicationName);
  await expect(detailsPage.getDescriptionValue('name')).toHaveText(applicationName);
  await expect(detailsPage.getDescriptionValue('namespace')).toHaveText(namespace);
  await expect(detailsPage.getDescriptionValue('type')).toContainText(
    APP_APPLICATION_DETAILS.typeValues.subscription
  );
  const repositoryValue = detailsPage.getDescriptionValue('repository');
  await assertRepositoryValue(repositoryValue, expectedRepositoriesResolved);

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
  await waitForLocatorTextMatch(clusterResourceStatusValue, /\d+/, {
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
