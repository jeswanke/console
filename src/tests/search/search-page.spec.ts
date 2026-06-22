/**
 * ACM Search page.
 */

import { SEARCH_PAGE, SEARCH_ROUTES } from '@constants/search';
import { expect, test } from '@fixtures/search-test';
import { pageUrlPathnameEquals } from '@lib/navigation';

test.describe('Search page - critical paths', { tag: ['@search'] }, () => {
  test('loads at /multicloud/search with title, search bar, and suggested card section', async ({
    searchPage,
    page,
  }) => {
    await searchPage.goto();

    expect(pageUrlPathnameEquals(page, SEARCH_ROUTES.page)).toBe(true);
    await expect(searchPage.getPageTitle()).toBeVisible();
    // Verify the search input is visible
    await expect(searchPage.getSearchInput()).toBeVisible();
    await expect(searchPage.getSearchInput()).toHaveAttribute(
      'placeholder',
      SEARCH_PAGE.searchPlaceholder
    );
    // Verify the run search button is visible
    await expect(searchPage.getRunSearchButton()).toBeVisible();
    // Verify the saved searches dropdown is visible with the correct text
    await expect(searchPage.getSavedSearchesDropdown()).toBeVisible();
    await expect(searchPage.getOpenNewSearchTabLink()).toBeVisible();
    // Verify suggested card section is visible with workload suggested card
    await expect(searchPage.getSuggestedCardSection()).toBeVisible();
    await expect(searchPage.getWorkloadSuggestedCard()).toBeVisible();
  });

  test('RHACM4K-411 - Search - Suggested search template and verify "Show related resources" button', async ({
    searchPage,
    page,
  }) => {
    await searchPage.goto();

    await test.step('Click the Workloads suggested search card', async () => {
      await searchPage.clickWorkloadSuggestedCard();
    });

    await test.step('Verify URL contains workload kind filters', async () => {
      // Pathname must remain on the search page
      expect(pageUrlPathnameEquals(page, SEARCH_ROUTES.page)).toBe(true);
      // All five workload kinds must be present in the filters query param
      await expect(page).toHaveURL(/filters={%22textsearch%22:%22kind%3ADaemonSet%2CDeployment%2CJob%2CStatefulSet%2CReplicaSet%22}/);
    });
  });

  test('RHACM4K-57212 - The test case focuses on verifying that Search returns and displays expected results', async ({
    searchPage,
  }) => {
    await searchPage.goto();

    await test.step('Add kind:Deployment and name:search-api filters and run search', async () => {
      await searchPage.filterByKindAndName('Deployment', SEARCH_PAGE.searchApiDeploymentName);
      await searchPage.waitForResultsTable();
    });

    await test.step('Verify result table contains the search-api Deployment row', async () => {
      await searchPage.verifySearchResultRowVisible(SEARCH_PAGE.searchApiDeploymentName);
    });

    await test.step('Expand related resources and verify Cluster accordion item is present', async () => {
      await searchPage.expandRelatedResources();
      await expect(searchPage.getClusterRelatedResourceAccordion()).toBeVisible();
    });
  });
});

test.describe('Search page - regression tests', { tag: ['@search'] }, () => {
  test('RHACM4K-64166: As a search user, I can configure and persist table columns for search results and related resources', async ({
    searchPage,
    page,
  }) => {
    await searchPage.goto();

    try {
      await test.step('Run kind:Deployment search', async () => {
        await searchPage.filterByKind('Deployment');
        await searchPage.waitForResultsTable();
      });

      await test.step('Verify the "Desired" column is visible', async () => {
        await searchPage.table.verifyColumnHeaderVisible(SEARCH_PAGE.desiredColumn);
      });

      await test.step('Open column management and uncheck "Desired"', async () => {
        await searchPage.manageColumns.open();
        await searchPage.manageColumns.uncheckColumn(SEARCH_PAGE.desiredColumn);
        await searchPage.manageColumns.save();
      });

      await test.step('Verify "Desired" column is no longer visible', async () => {
        await searchPage.table.verifyColumnHeaderNotVisible(SEARCH_PAGE.desiredColumn);
      });

      await test.step('Refresh the page and verify "Desired" column is still hidden', async () => {
        await page.reload();
        await searchPage.waitForResultsTable();
        await searchPage.table.verifyColumnHeaderNotVisible(SEARCH_PAGE.desiredColumn);
      });
    } finally {
      await searchPage.manageColumns.open();
      await searchPage.manageColumns.restoreDefaultsAndSave();
    }
  });
});
