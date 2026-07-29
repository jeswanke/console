/**
 * ACM Overview page (`/multicloud/home/overview`) — smoke test suite.
 *
 * Each test independently navigates to the Overview page to verify core
 * sections and interactive controls are present.  Tests are independent so
 * they can be retried and parallelised without shared mutable state.
 */

import { OVERVIEW_PAGE } from '@constants/overview';
import { expect, test } from '@fixtures/search-test';

test.describe('Overview page - critical paths', { tag: ['@search', '@overview'] }, () => {
  test('RHACM4K-38506 - Verify Fleet View Features from Overview Page', async ({
    overviewPage,
  }) => {
    await overviewPage.goto();
    await overviewPage.waitForOverviewReady();

    await test.step('Select the local-cluster label key', async () => {
      await overviewPage.selectClusterLabelKey();
    });

    await test.step('Select the "true" label value', async () => {
      await overviewPage.selectClusterLabelValue();
    });

    await test.step('Verify the local-cluster filter chip is displayed', async () => {
      await expect(overviewPage.getLocalClusterFilterChip()).toBeVisible();
    });
  });

  test('Summary section - Clusters card is present', async ({ overviewPage }) => {
    await overviewPage.goto();
    await overviewPage.waitForOverviewReady();

    await test.step(`Verify the "${OVERVIEW_PAGE.summary.clustersCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getClustersCard()).toBeVisible();
    });
    await test.step(`Verify the "${OVERVIEW_PAGE.summary.appTypesCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getAppTypesCard()).toBeVisible();
    });
    await test.step(`Verify the "${OVERVIEW_PAGE.summary.policiesCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getPoliciesCard()).toBeVisible();
    });
    await test.step(`Verify the "${OVERVIEW_PAGE.summary.clusterVersionCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getClusterVersionCard()).toBeVisible();
    });
    await test.step(`Verify the "${OVERVIEW_PAGE.summary.nodesCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getNodesCard()).toBeVisible();
    });
    await test.step(`Verify the "${OVERVIEW_PAGE.summary.workerCoreCountCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getWorkerCoreCountCard()).toBeVisible();
    });
  });

  test('Insights section - Cards are present', async ({ overviewPage }) => {
    await overviewPage.goto();
    await overviewPage.waitForOverviewReady();

    await test.step('Verify the Insights section heading is visible', async () => {
      await expect(overviewPage.getInsightsSectionHeading()).toBeVisible();
    });

    await test.step(`Verify the "${OVERVIEW_PAGE.insights.clusterRecommendationCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getClusterRecommendationCard()).toBeVisible();
    });

    await test.step(`Verify the "${OVERVIEW_PAGE.insights.upgradeRiskPredictionCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getUpgradeRiskPredictionCard()).toBeVisible();
    });
  });

  test('Cluster Health section - Status card is present', async ({ overviewPage }) => {
    await overviewPage.goto();
    await overviewPage.waitForOverviewReady();

    await test.step('Verify the Cluster health section heading is visible', async () => {
      await expect(overviewPage.getClusterHealthSectionHeading()).toBeVisible();
    });

    await test.step(`Verify the "${OVERVIEW_PAGE.clusterHealth.statusCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getStatusCard()).toBeVisible();
    });

    await test.step(`Verify the "${OVERVIEW_PAGE.clusterHealth.violationsCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getViolationsCard()).toBeVisible();
    });

    await test.step(`Verify the "${OVERVIEW_PAGE.clusterHealth.clusterAddonsCardTitle}" card is visible`, async () => {
      await expect(overviewPage.getClusterAddonsCard()).toBeVisible();
    });
  });
});
