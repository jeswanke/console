import { AcmTable } from '@components/patternfly/AcmTable';
import { ManageColumnsDialog } from '@components/patternfly/ManageColumnsDialog';
import { SAVED_SEARCH, SEARCH_PAGE, SEARCH_ROUTES } from '@constants/search';
import { pageUrlPathnameEquals } from '@lib/navigation';
import { BasePage } from '@pages/BasePage';
import { Locator, Page, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';

/** ACM Search page (`/multicloud/search`). */
export class SearchPage extends BasePage {
  readonly table: AcmTable;
  readonly manageColumns: ManageColumnsDialog;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.table = new AcmTable(page);
    this.manageColumns = new ManageColumnsDialog(page);
  }

  /**
   * Navigate to the Search page.
   *
   * @param presetQuery - Optional query string to append to the URL, including
   *   the leading `?`.  When provided, navigation always happens (the query
   *   changes the URL state even if the pathname is unchanged).
   *
   * @example
   * // bare page
   * await searchPage.goto();
   *
   * @example
   * // with pre-applied filters
   * await searchPage.goto('?filters={"textsearch":"kind%3APod%20name%3Asearch-api-*"}');
   */
  async goto(presetQuery?: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    // Skip navigation when already on the bare search page and no preset query
    // is requested; a preset query always requires a full navigation to apply
    // the new URL state.
    if (!presetQuery && pageUrlPathnameEquals(this.page, SEARCH_ROUTES.page)) {
      await this.waitForSearchReady();
      return;
    }
    await this.page.goto(`${consoleUrl}${SEARCH_ROUTES.page}${presetQuery ?? ''}`);
    await this.waitForSearchReady();
  }

  /** Wait for heading, search bar, and PF loading indicators to settle. */
  async waitForSearchReady(): Promise<void> {
    await this.getPageTitle().waitFor({ state: 'visible' });
    await expect(this.getSearchInput()).toBeVisible();
    await expect(this.getRunSearchButton()).toBeVisible();
    await this.waitForLoad();
  }

  getPageTitle(): Locator {
    return this.page.getByRole('heading', { name: SEARCH_PAGE.title, level: 1 });
  }

  getSearchInput(): Locator {
    return this.page.getByLabel(SEARCH_PAGE.searchInputAriaLabel);
  }

  getRunSearchButton(): Locator {
    return this.page.locator(`#${SEARCH_PAGE.runSearchButtonId}`);
  }

  getSavedSearchesDropdown(): Locator {
    return this.page.getByRole('button', { name: SEARCH_PAGE.savedSearchesDropdown });
  }

  getOpenNewSearchTabLink(): Locator {
    return this.page.getByRole('link', { name: SEARCH_PAGE.openNewSearchTab });
  }

  getSuggestedCardSection(): Locator {
    return this.page.getByRole('heading', { name: SEARCH_PAGE.suggestedCardSectionHeader });
  }

  getWorkloadSuggestedCard(): Locator {
    return this.page.getByText(SEARCH_PAGE.workloadSuggestedCardHeader, { exact: true });
  }

  /** Click the Workloads suggested search card. */
  async clickWorkloadSuggestedCard(): Promise<void> {
    await this.getWorkloadSuggestedCard().click();
    await this.waitForLoad();
  }

  /** Type `kind:<kind>` filter and run the search. */
  async filterByKind(kind: string): Promise<void> {
    await this.getSearchInput().clear();
    await this.getSearchInput().fill('kind');
    await this.getSearchInput().press('Enter');
    await this.getSearchInput().fill(kind);
    await this.getSearchInput().press('Enter');
    await this.getRunSearchButton().click();
    await this.waitForLoad();
  }

  /** Type `kind:<kind> name:<name>` filters and run the search. */
  async filterByKindAndName(kind: string, name: string): Promise<void> {
    await this.getSearchInput().clear();
    await this.getSearchInput().fill('kind');
    await this.getSearchInput().press('Enter');
    await this.getSearchInput().fill(kind);
    await this.getSearchInput().press('Enter');
    await this.getSearchInput().fill('name');
    await this.getSearchInput().press('Enter');
    await this.getSearchInput().fill(name);
    await this.getSearchInput().press('Enter');
    await this.getRunSearchButton().click();
    await this.waitForLoad();
  }

  /**
   * Verify that a result row whose name cell matches `resourceName` is visible
   * in the search results table.
   */
  async verifySearchResultRowVisible(resourceName: string): Promise<void> {
    await expect(
      this.page.locator('table').getByText(resourceName, { exact: true }).first()
    ).toBeVisible();
  }

  async expandRelatedResources(): Promise<void> {
    await this.page.getByText('Show related resources', { exact: true }).first().click();
    await this.waitForLoad();
    await expect(this.page.locator('.pf-v6-c-accordion')).toHaveCount(2); // one main result accordion & one for related results
  }

  /**
   * Returns the Cluster kind accordion toggle button inside the expanded
   * related-resources panel.
   */
  getClusterRelatedResourceAccordion(): Locator {
    return this.page
      .locator('.pf-v6-c-accordion__toggle')
      .getByText(SEARCH_PAGE.clusterRelatedResourceLabel);
  }

  /** Wait for at least one results table to appear in the DOM. */
  async waitForResultsTable(): Promise<void> {
    await expect(this.page.locator('table')).toBeVisible();
    await this.waitForLoad();
  }

  /**
   * Navigate to Search pre-filtered for `kind:<kind>` via the URL query string.
   * Does not require results to appear (callers may assert empty / hidden rows).
   */
  async filterByKind(kind: string): Promise<void> {
    const filters = encodeURIComponent(JSON.stringify({ textsearch: `kind:${kind}` }));
    await this.goto(`?filters=${filters}`);
  }

  /**
   * Navigate to the Search page pre-filtered for `kind:Pod name:<podName>`,
   * wait for the results table, then click the first resource-name link to
   * open the Search Details page.
   */
  async openFirstPodDetails(podName: string): Promise<void> {
    const filters = encodeURIComponent(JSON.stringify({ textsearch:`kind:Pod name:${podName}` }));
    await this.goto(`?filters=${filters}`);
    await this.waitForResultsTable();
    await this.page.locator('table').getByRole('link').first().click();
    await this.page.waitForURL(new RegExp(`${SEARCH_ROUTES.resourceDetails}`));
  }

  /**
   * Search for `kind:<kind> name:<name>`, wait for results, then click the
   * first link to open the Search Details page. Works for any resource kind.
   */
  async openFirstResourceDetails(kind: string, name: string): Promise<void> {
    await this.filterByKindAndName(kind, name);
    await this.waitForResultsTable();
    await this.page.locator('table').getByRole('link').first().click();
    await this.page.waitForURL(new RegExp(`${SEARCH_ROUTES.resourceDetails}`));
  }

  // ---------------------------------------------------------------------------
  // Saved searches
  // ---------------------------------------------------------------------------

  getSaveSearchButton(): Locator {
    return this.page.getByRole('button', { name: SAVED_SEARCH.saveSearchButton });
  }

  /** Click the "Save search" toolbar button and wait for the modal dialog to open. */
  async clickSaveSearchButton(): Promise<void> {
    await this.getSaveSearchButton().click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Save search' })).toBeVisible();
  }

  /**
   * Fill the Save / Edit search modal's name field with `name` and submit.
   * Clears any pre-existing value before filling (handles both create and edit).
   * Waits for the dialog to close after clicking Save.
   */
  async fillSaveSearchModal(name: string): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(this.page.getByRole('heading', { name: 'Save search' })).toBeVisible();

    const nameInput = dialog.getByPlaceholder(SAVED_SEARCH.modal.nameInputPlaceholder);
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(name);

    // const saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
    const saveButton = dialog.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(
      this.page.getByRole('heading', { name: 'Save search' })
    ).toBeHidden({ timeout: 5000 });
  }

  /**
   * Navigate to `/multicloud/search` without any query params, bypassing the
   * "already on this page" short-circuit in `goto()`.  Use this to clear an
   * active search filter and return to the saved-search cards view.
   */
  async gotoFresh(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${SEARCH_ROUTES.page}`);
    await this.waitForSearchReady();
  }

  /**
   * Returns the PF6 Card element for a saved search identified by `name`.
   *
   * PF6 `CardTitle` renders as `<div class="pf-v6-c-card__title-text">` — it
   * does NOT carry an ARIA heading role.  `getByText(name, { exact: true })`
   * matches that element only when its full text content equals `name`, so
   * "foo" will never collide with "foo-edited".
   */
  getSavedSearchCard(name: string): Locator {
    return this.page.locator('.pf-v6-c-card').filter({
      has: this.page.getByText(name, { exact: true }),
    });
  }

  /**
   * Open the kebab dropdown for the saved search `name` and click `action`
   * (e.g. `SAVED_SEARCH.card.editAction`).
   */
  async clickSavedSearchCardAction(name: string, action: string): Promise<void> {
    const card = this.getSavedSearchCard(name);
    await expect(card).toBeVisible();
    const toggle = card.locator(SAVED_SEARCH.card.kebabToggleSelector);

    await expect(async () => {
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
        await toggle.click();
      }
      await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 3_000 });
      const menuitem = this.page.getByRole('menuitem', { name: action });
      await expect(menuitem).toBeVisible({ timeout: 3_000 });
      await menuitem.click({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
  }

  /**
   * Returns the URL shown in the Share search modal's ClipboardCopy input.
   * Caller is responsible for waiting for the modal to be open first.
   */
  async getShareSearchUrl(): Promise<string> {
    const input = this.page.locator('.pf-v6-c-clipboard-copy input');
    await expect(input).toBeVisible();
    return input.inputValue();
  }

  /**
   * Close the currently open modal via the Escape key.
   * Preferred over clicking the Close button because PF6 modal animations can
   * detach the button from the DOM between Playwright's visibility check and
   * the actual click, causing flaky timeouts.
   */
  async closeModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.page.getByRole('dialog')).toBeHidden();
  }

  /**
   * Click the "Delete" confirm button inside the delete confirmation dialog
   * and wait for the dialog to close.
   */
  async confirmDeleteSearch(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(this.page.getByRole('heading', { name: 'Delete saved search?' })).toBeVisible();
    const confirmButton = dialog.getByRole('button', { name: SAVED_SEARCH.deleteModal.confirmButton });
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeEnabled();
    await confirmButton.dispatchEvent('click');
    await expect(dialog).toBeHidden();
  }
}
