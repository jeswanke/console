/**
 * ACM Search Details page — tab verification suite.
 *
 * Each test independently navigates: Search → kind:Pod name:search-api-* →
 * click first result → verify the target tab.  Tests are independent so they
 * can be retried and parallelised without shared mutable state.
 */

import { SEARCH_DETAILS_PAGE } from '@constants/search';
import { expect, test } from '@fixtures/search-test';

test.describe('Search Details - Critical paths', { tag: ['@search', '@details'] }, () => {
  test('RHACM4K-57211 - Search - Verify Search result details', async ({
    searchPage,
    searchDetailsPage,
  }) => {
    await searchPage.goto();

    await test.step('Navigate to the Pod Details page', async () => {
      await searchPage.openFirstPodDetails(SEARCH_DETAILS_PAGE.podNameFilter);
      await searchDetailsPage.waitForDetailsPageLoad();
    });

    await test.step('Pod Details tab is selected by default', async () => {
      await expect(searchDetailsPage.getTab(SEARCH_DETAILS_PAGE.tabs.details)).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    await test.step('Verify "Pod details" section heading is present', async () => {
      await expect(searchDetailsPage.getDetailsSection()).toBeVisible();
    });

    await test.step('Verify "Conditions" section heading is present', async () => {
      await expect(searchDetailsPage.getConditionsSection()).toBeVisible();
    });
  });

  test('Verify "YAML" tab displays correctly with valid YAML', async ({
    searchPage,
    searchDetailsPage,
  }) => {
    await searchPage.goto();

    await test.step('Navigate to the Pod Details page', async () => {
      await searchPage.openFirstPodDetails(SEARCH_DETAILS_PAGE.podNameFilter);
      await searchDetailsPage.waitForDetailsPageLoad();
    });

    await test.step('Click the YAML tab', async () => {
      await searchDetailsPage.clickTab(SEARCH_DETAILS_PAGE.tabs.yaml);
    });

    await test.step('Verify the YAML editor is visible and contains "kind: Pod"', async () => {
      await expect(searchDetailsPage.getYamlEditor()).toBeVisible();
      await expect(
        searchDetailsPage.getYamlLine(SEARCH_DETAILS_PAGE.yamlPodKindLine)
      ).toBeVisible();
    });
  });

  test('Verify "Related Resources" tab displays correctly with at least a Cluster accordion item', async ({
    searchPage,
    searchDetailsPage,
  }) => {
    await searchPage.goto();

    await test.step('Navigate to the Pod Details page', async () => {
      await searchPage.openFirstPodDetails(SEARCH_DETAILS_PAGE.podNameFilter);
      await searchDetailsPage.waitForDetailsPageLoad();
    });

    await test.step('Click the Related Resources tab', async () => {
      await searchDetailsPage.clickTab(SEARCH_DETAILS_PAGE.tabs.relatedResources);
    });

    await test.step('Verify at least one Cluster accordion item is present', async () => {
      await expect(searchDetailsPage.getClusterAccordionItem()).toBeVisible();
    });
  });

  test('Verify "Logs" tab displays correctly', async ({ searchPage, searchDetailsPage }) => {
    await searchPage.goto();

    await test.step('Navigate to the Pod Details page', async () => {
      await searchPage.openFirstPodDetails(SEARCH_DETAILS_PAGE.podNameFilter);
      await searchDetailsPage.waitForDetailsPageLoad();
    });

    await test.step('Click the Logs tab', async () => {
      await searchDetailsPage.clickTab(SEARCH_DETAILS_PAGE.tabs.logs);
    });

    await test.step('Verify the log viewer is visible', async () => {
      await expect(searchDetailsPage.getLogsViewer()).toBeVisible();
    });
  });
});
