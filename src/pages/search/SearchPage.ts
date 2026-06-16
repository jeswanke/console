import { AcmTable } from '@components/patternfly/AcmTable';
import { ManageColumnsDialog } from '@components/patternfly/ManageColumnsDialog';
import { SEARCH_PAGE, SEARCH_ROUTES } from '@constants/search';
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

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, SEARCH_ROUTES.page)) {
      await this.waitForSearchReady();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${SEARCH_ROUTES.page}`);
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
  
  async filterByKind(kind: string): Promise<void> {
    await this.getSearchInput().clear();
    await this.getSearchInput().fill('kind');
    await this.getSearchInput().press('Enter');
    await this.getSearchInput().fill(kind);
    await this.getSearchInput().press('Enter');
    await this.getRunSearchButton().click();
    await this.waitForLoad();
  }

  /** Wait for at least one results table to appear in the DOM. */
  async waitForResultsTable(): Promise<void> {
    await expect(this.page.locator('table')).toBeVisible();
    await this.waitForLoad();
  }
}
