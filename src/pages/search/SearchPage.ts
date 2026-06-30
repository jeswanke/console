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

  /** Click the Workloads suggested search card. */
  async clickWorkloadSuggestedCard(): Promise<void> {
    await this.getWorkloadSuggestedCard().click();
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
   * Search for `kind:Pod name:<podName>`, wait for the results table, then
   * click the first resource-name link to open the Search Details page.
   */
  async openFirstPodDetails(podName: string): Promise<void> {
    await this.filterByKindAndName('Pod', podName);
    await this.waitForResultsTable();
    await this.page.locator('table').getByRole('link').first().click();
    await this.page.waitForURL(new RegExp(`${SEARCH_ROUTES.resourceDetails}`));
  }
}
