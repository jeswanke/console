/**
 * ACM Search page.
 */

import { SEARCH_PAGE, SEARCH_ROUTES } from '@constants/search';
import { expect, test } from '@fixtures/search-test';
import { pageUrlPathnameEquals } from '@lib/navigation';

test.describe('Search page', { tag: ['@search'] }, () => {
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
