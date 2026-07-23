/**
 * ACM Search — Saved Searches
 *
 * Tests cover the full saved-search lifecycle on /multicloud/search:
 *   1. Run a kind:Pod search and save it through the Save Search modal.
 *   2. Edit the saved search name (append "-edited").
 *   3. Share the saved search and verify the share URL.
 *   4. Delete the saved search and verify the card is gone from the home page.
 *
 * Tests are serial because each step depends on the previous one's state.
 */

import { SAVED_SEARCH } from '@constants/search';
import { expect, test } from '@fixtures/search-test';

// Serial mode: tests within this file run one at a time.  Eliminates
// concurrent search-API requests that cause hub slowdowns and timeouts.
test.describe.configure({ mode: 'serial' });

test.describe(
  'Search - Saved searches - critical paths',
  { tag: ['@search', '@savedSearch'] },
  () => {
    // Both names are derived from uniqueName in beforeAll so they are stable
    // for the whole serial block yet unique across parallel / repeated runs.
    let savedSearchName: string;
    let editedSearchName: string;

    test.afterAll(async ({ oc }) => {
      // Delete the UserPreference resource directly via CLI rather than through
      // the UI — faster, always safe, and works even if the browser tests failed
      // partway through.  --ignore-not-found (inside deleteUserPreference) means
      // this is a no-op when the delete test already cleaned up successfully.
      const username = await oc.getCurrentUser();
      await oc.deleteUserPreference(username);
    });

    test.beforeAll(async ({ uniqueName }) => {
      savedSearchName = `playwright-test-${uniqueName}`;
      editedSearchName = `${savedSearchName}-edited`;
    });

    test.beforeEach(async ({ searchPage }) => {
      await searchPage.goto();
    });

    test('Should run kind:Pod search and save via the saved search modal', async ({
      searchPage,
    }) => {
      await test.step('Search for kind:Pod and wait for results', async () => {
        const filters = encodeURIComponent(JSON.stringify({ textsearch:`kind:Pod` }));
        await searchPage.goto(`?filters=${filters}`);
        await searchPage.waitForResultsTable();
      });

      await test.step('Open Save Search modal and fill in the name', async () => {
        await searchPage.clickSaveSearchButton();
        await searchPage.fillSaveSearchModal(savedSearchName);
      });

      await test.step('Navigate to blank search page and verify saved search card appears', async () => {
        await searchPage.gotoFresh();
        await expect(searchPage.getSavedSearchCard(savedSearchName)).toBeVisible();
      });
    });

    test('Should edit saved search and append "-edited" to the name', async ({ searchPage }) => {
      await test.step('Open the Edit action from the saved search card', async () => {
        await searchPage.clickSavedSearchCardAction(savedSearchName, SAVED_SEARCH.card.editAction);
      });

      await test.step('Update the name to include "-edited" and save', async () => {
        await searchPage.fillSaveSearchModal(editedSearchName);
      });

      await test.step('Refresh to reflect the updated saved search name', async () => {
        await searchPage.gotoFresh();
      });

      await test.step('Verify the renamed card is visible and the original name card is absent', async () => {
        await expect(searchPage.getSavedSearchCard(editedSearchName)).toBeVisible();
        await expect(searchPage.getSavedSearchCard(savedSearchName)).toBeHidden();
      });
    });

    test('Should click share on saved search and verify the share link', async ({ searchPage }) => {
      await test.step('Open the Share action from the saved search card', async () => {
        await searchPage.clickSavedSearchCardAction(
          editedSearchName,
          SAVED_SEARCH.card.shareAction
        );
      });

      await test.step('Verify the share URL contains the encoded search query', async () => {
        const shareUrl = await searchPage.getShareSearchUrl();
        // URL format: <origin>/multicloud/search?filters={"textsearch":"kind:Pod"}
        expect(shareUrl).toContain('filters=');
        expect(shareUrl).toContain(encodeURIComponent('kind:Pod'));
      });

      await test.step('Close the share modal', async () => {
        await searchPage.closeModal();
      });
    });

    test('Should delete saved search and verify the card is removed from the Search home page', async ({
      searchPage,
    }) => {
      await test.step('Delete the saved search via the card kebab menu', async () => {
        await searchPage.clickSavedSearchCardAction(
          editedSearchName,
          SAVED_SEARCH.card.deleteAction
        );
        await searchPage.confirmDeleteSearch();
      });

      await test.step('Verify the saved search card is no longer on the search page', async () => {
        await expect(searchPage.getSavedSearchCard(editedSearchName)).toBeHidden();
      });
    });
  }
);
