import { Page, Locator } from '@playwright/test';
import { AcmTable } from '@components/AcmTable';
import { SELECTORS } from '@constants/selectors';
import {
  APP_TABLE,
  APP_TABLE_COLUMNS,
  APP_TABLE_ROW_ACTIONS,
  APP_TABLE_COLUMN_HELP,
  APP_TOOLBAR,
  APP_FILTER,
  APP_CREATE_MENU,
  APP_COMPARE_POPOVER,
} from '@constants/app';
import type { AppTableColumnHelpKey } from '@constants/app';

/**
 * Applications table component (Applications list page).
 *
 * Extends AcmTable for search and row-by-OUIA-id. Adds app-specific:
 * Create application, filter, export, Compare link, getRowByName, getCellByLabel,
 * row actions (kebab), and pagination.
 */
export class ApplicationsTable extends AcmTable {
  private readonly table: Locator;
  private readonly createButton: Locator;
  private readonly filterButton: Locator;
  private readonly exportButton: Locator;

  constructor(page: Page) {
    super(page);
    this.table = page.locator(SELECTORS.application.table);
    this.createButton = page.locator(SELECTORS.application.createButton);
    this.filterButton = page.locator(SELECTORS.application.filterButton);
    this.exportButton = page.locator(SELECTORS.application.exportButton);
  }

  // ---------------------------------------------------------------------------
  // Toolbar (app-specific)
  // ---------------------------------------------------------------------------

  getCreateApplicationButton(): Locator {
    return this.createButton;
  }

  async clickCreateApplication(): Promise<void> {
    await this.createButton.click();
  }

  /** Open Create application dropdown (PF6 MenuToggle). Use after clickCreateApplication() to get the menu. */
  getCreateApplicationMenu(): Locator {
    return this.page.getByRole(APP_CREATE_MENU.menuRole);
  }

  /** Menu item in the Create application dropdown by visible label (e.g. APP_CREATE_MENU.options.argoPullModel). */
  getCreateMenuItem(optionLabel: string): Locator {
    return this.getCreateApplicationMenu().getByRole('menuitem').filter({ hasText: optionLabel });
  }

  /** Menu item in the Create application dropdown by button id (e.g. APP_CREATE_MENU.optionIds.argoPullModel). */
  getCreateMenuItemById(optionId: string): Locator {
    return this.getCreateApplicationMenu().locator(`button#${optionId}`);
  }

  /** Description element for a Create application menu option (by option button id). */
  getCreateMenuItemDescription(optionId: string): Locator {
    return this.getCreateMenuItemById(optionId).locator(
      '.pf-v6-c-menu__item-description'
    );
  }

  getFilterButton(): Locator {
    return this.filterButton;
  }

  /** Open the Filter dropdown (click the Filter toolbar button) */
  async openFilter(): Promise<void> {
    await this.filterButton.click();
  }

  /** Get the open filter menu (PF6 Select). Use after openFilter(). */
  getFilterMenu(): Locator {
    return this.page.locator(`[aria-label="${APP_FILTER.menuAriaLabel}"]`);
  }

  /** Get a filter option by its visible label (e.g. "System", "OpenShift", "local-cluster") */
  getFilterOption(optionLabel: string): Locator {
    return this.getFilterMenu().getByRole('menuitem').filter({ hasText: optionLabel });
  }

  /** Select (check) a filter option by label. Opens filter if needed. */
  async selectFilterOption(optionLabel: string): Promise<void> {
    const menu = this.getFilterMenu();
    const isVisible = await menu.isVisible().catch(() => false);
    if (!isVisible) {
      await this.openFilter();
      await menu.waitFor({ state: 'visible', timeout: 5000 });
    }
    const option = this.getFilterOption(optionLabel);
    await option.locator('input[type="checkbox"]').check();
  }

  /** Deselect (uncheck) a filter option by label. Filter menu must be open. */
  async deselectFilterOption(optionLabel: string): Promise<void> {
    await this.getFilterOption(optionLabel).locator('input[type="checkbox"]').uncheck();
  }

  getExportButton(): Locator {
    return this.exportButton;
  }

  getCompareApplicationTypesButton(): Locator {
    return this.page.getByRole('button', { name: APP_TOOLBAR.compareTypesLabel });
  }

  /** Click Compare application types (opens popover dialog). */
  async clickCompareApplicationTypes(): Promise<void> {
    await this.getCompareApplicationTypesButton().click();
  }

  /** Compare application types popover (role="dialog" with title heading). Use after clickCompareApplicationTypes(). */
  getCompareApplicationTypesPopover(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({
        has: this.page.getByRole('heading', {
          name: APP_COMPARE_POPOVER.title,
          level: 6,
        }),
      });
  }

  /** Body content of the Compare application types popover (for asserting type descriptions). */
  getComparePopoverBody(): Locator {
    return this.getCompareApplicationTypesPopover().locator(
      '.pf-v6-c-popover__body'
    );
  }

  // ---------------------------------------------------------------------------
  // Table (app-specific; search + getRow from AcmTable)
  // ---------------------------------------------------------------------------

  /** Get the table container (role=grid) */
  getTable(): Locator {
    return this.table;
  }

  /** Click the help icon next to a column header (Overview table). Opens PF6 Popover. */
  async openColumnHelp(columnLabel: AppTableColumnHelpKey): Promise<void> {
    await this.table
      .locator(`th[data-label="${columnLabel}"]`)
      .locator('.pf-v6-c-table__column-help-action button')
      .click();
  }

  /** Get the column help popover (role=dialog) by column. Use after openColumnHelp(columnLabel). */
  getColumnHelpPopover(columnLabel: AppTableColumnHelpKey): Locator {
    const bodyText = APP_TABLE_COLUMN_HELP.columns[columnLabel];
    return this.page.getByRole('dialog').filter({ hasText: bodyText });
  }

  // ---------------------------------------------------------------------------
  // Rows and cells
  // ---------------------------------------------------------------------------

  /** Get a row by OUIA component id (e.g. "local-cluster/aap/aap"). Delegates to AcmTable.getRow. */
  getRowByOuiaId(ouiaId: string): Locator {
    return this.getRow(ouiaId);
  }

  /** Get a row by application name (link in Name column) */
  getRowByName(appName: string): Locator {
    return this.table
      .getByRole('row')
      .filter({ has: this.page.getByRole('link', { name: appName, exact: true }) });
  }

  /** Get the Name link in a row (for clicking through to details) */
  getNameLink(row: Locator): Locator {
    return row.getByRole('link').first();
  }

  /** Get cell by column label (data-label on td); row from getRowByName or getRowByOuiaId */
  getCellByLabel(row: Locator, columnLabel: keyof typeof APP_TABLE_COLUMNS): Locator {
    const label = APP_TABLE_COLUMNS[columnLabel];
    return row.locator(`td[data-label="${label}"]`);
  }

  getRowActionsButton(row: Locator): Locator {
    return row.getByRole('button', { name: APP_TABLE_ROW_ACTIONS.actionsAriaLabel });
  }

  async openRowActions(row: Locator): Promise<void> {
    await this.getRowActionsButton(row).click();
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  getPaginationTop(): Locator {
    return this.page.locator(`#${APP_TABLE.paginationTopId}`);
  }

  getPaginationBottom(): Locator {
    return this.page.locator(`#${APP_TABLE.paginationBottomId}`);
  }

  getNextPageButton(): Locator {
    return this.page.getByRole('button', { name: 'Go to next page' });
  }

  getPreviousPageButton(): Locator {
    return this.page.getByRole('button', { name: 'Go to previous page' });
  }
}
