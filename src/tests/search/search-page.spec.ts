/**
 * ACM Search page.
 */

import { SEARCH_PAGE, SEARCH_RESULTS, SEARCH_ROUTES } from '@constants/search';
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
});

test.describe('Search page - regressions', { tag: ['@search'] }, () => {
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
        await searchPage.table.verifyColumnHeaderVisible(SEARCH_RESULTS.desiredColumn);
      });

      await test.step('Open column management and uncheck "Desired"', async () => {
        await searchPage.manageColumns.open();
        await searchPage.manageColumns.uncheckColumn(SEARCH_RESULTS.desiredColumn);
        await searchPage.manageColumns.save();
      });

      await test.step('Verify "Desired" column is no longer visible', async () => {
        await searchPage.table.verifyColumnHeaderNotVisible(SEARCH_RESULTS.desiredColumn);
      });

      await test.step('Refresh the page and verify "Desired" column is still hidden', async () => {
        await page.reload();
        await searchPage.waitForResultsTable();
        await searchPage.table.verifyColumnHeaderNotVisible(SEARCH_RESULTS.desiredColumn);
      });
    } finally {
      await searchPage.manageColumns.open();
      await searchPage.manageColumns.restoreDefaultsAndSave();
    }
  });
});
