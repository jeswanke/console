import { Page, Locator } from '@playwright/test';
import { AcmTable } from '@components/patternfly/AcmTable';
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

  /** Open Create application dropdown. Use after clickCreateApplication() to get the menu. */
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

  /** Description text under a Create menu option (sibling/parent layout; class substring avoids design-system version coupling). */
  getCreateMenuItemDescription(optionId: string): Locator {
    const btn = this.getCreateMenuItemById(optionId);
    const inMenuItemRow = this.getCreateApplicationMenu()
      .getByRole('menuitem')
      .filter({ has: btn })
      .locator('[class*="item-description"]')
      .first();
    const nextToButton = btn.locator('..').locator('[class*="item-description"]').first();
    return inMenuItemRow.or(nextToButton);
  }

  getFilterButton(): Locator {
    return this.filterButton;
  }

  /** Open the Filter dropdown (click the Filter toolbar button) */
  async openFilter(): Promise<void> {
    await this.filterButton.click();
    const listbox = this.getFilterListbox();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    await listbox.getByRole('checkbox').first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Toolbar **Clear all filters** (PF link button). Present when at least one table filter is active
   * (see Playwriter snapshot on Applications list).
   */
  getClearAllFiltersButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_TOOLBAR.clearAllFiltersButtonName,
      exact: true,
    });
  }

  /** Click **Clear all filters** (resets filter chips / type checks). */
  async clickClearAllFilters(): Promise<void> {
    await this.getClearAllFiltersButton().click();
  }

  /** Root of the filter control (toggle + label). The open listbox may be portaled and NOT under this node. */
  getFilterMenu(): Locator {
    return this.page.locator(`[aria-label="${APP_FILTER.menuAriaLabel}"]`);
  }

  /**
   * Applications filter listbox: panel may be portaled — avoid chaining from getFilterMenu().
   * Anchor by the in-panel "Type" heading.
   */
  getFilterListbox(): Locator {
    return this.page
      .getByRole('listbox')
      .filter({
        has: this.page.getByRole('heading', {
          name: APP_FILTER.groupTitles.type,
          level: 1,
        }),
      })
      .first();
  }

  /**
   * Filter row by option label (accessible name is like "System 89").
   * Use checkbox role — the panel listbox is often not wired as menuitem in Chromium.
   */
  getFilterOption(optionLabel: string): Locator {
    const name = new RegExp(escapeRegExp(optionLabel));
    return this.getFilterListbox().getByRole('checkbox', { name });
  }

  /** Select (check) a filter option by label. Opens filter if needed. */
  async selectFilterOption(optionLabel: string): Promise<void> {
    const listbox = this.getFilterListbox();
    const isOpen = await listbox.getByRole('checkbox').first().isVisible().catch(() => false);
    if (!isOpen) {
      await this.openFilter();
    }
    await this.getFilterOption(optionLabel).check();
  }

  /** Deselect (uncheck) a filter option by label. Filter menu must be open. */
  async deselectFilterOption(optionLabel: string): Promise<void> {
    await this.getFilterOption(optionLabel).uncheck();
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

  /** Compare types panel (typically role=dialog with title heading). */
  getCompareApplicationTypesPopover(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('heading', { name: APP_COMPARE_POPOVER.title }) })
      .first();
  }

  /** Compare copy lives on the dialog root in current console builds. */
  getComparePopoverBody(): Locator {
    return this.getCompareApplicationTypesPopover();
  }

  // ---------------------------------------------------------------------------
  // Table (app-specific; search + getRow from AcmTable)
  // ---------------------------------------------------------------------------

  /** Get the table container (role=grid) */
  getTable(): Locator {
    return this.table;
  }

  private headerCellForColumn(columnLabel: AppTableColumnHelpKey): Locator {
    return this.table.locator(`th[data-label="${columnLabel}"]`);
  }

  /**
   * Help trigger in a column header.
   * ACM Th uses PF info popover: some builds expose "More info", others put the full tooltip
   * string on the button's accessible name (see Overview.tsx tooltips).
   */
  private columnHelpTrigger(th: Locator, columnLabel: AppTableColumnHelpKey): Locator {
    const byAccessibleName = th
      .getByRole('button', {
        name: /more info|more information|column help/i,
      })
      .or(th.locator('button[aria-label*="More"]'))
      .or(th.locator('button[aria-label*="more"]'))
      .or(th.locator('button[aria-label*="Help"]'))
      .or(th.locator('button[aria-label*="help"]'));

    const bodyText = APP_TABLE_COLUMN_HELP.columns[columnLabel];
    const prefix = bodyText.slice(0, Math.min(64, bodyText.length));
    const byTooltipPrefix = th.getByRole('button', {
      name: new RegExp(escapeRegExp(prefix)),
    });

    return byAccessibleName.or(byTooltipPrefix);
  }

  /** True when Overview table shows this column with an info/help control (Repository/Pod vary by build). */
  async hasColumnHelp(columnLabel: AppTableColumnHelpKey): Promise<boolean> {
    const th = this.headerCellForColumn(columnLabel);
    if ((await th.count()) === 0) return false;
    return (await this.columnHelpTrigger(th, columnLabel).count()) > 0;
  }

  /** Click the help control next to a column header (Overview table). */
  async openColumnHelp(columnLabel: AppTableColumnHelpKey): Promise<void> {
    const th = this.headerCellForColumn(columnLabel);
    await this.columnHelpTrigger(th, columnLabel).first().click();
  }

  /** Column help floating content: dialog or tooltip role, matched by expected body copy. */
  getColumnHelpPopover(columnLabel: AppTableColumnHelpKey): Locator {
    const bodyText = APP_TABLE_COLUMN_HELP.columns[columnLabel];
    return this.page
      .locator('[role="dialog"], [role="tooltip"]')
      .filter({ hasText: bodyText })
      .first();
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

  /** First data row (tbody); use when the table has at least one application. */
  getFirstDataRow(): Locator {
    return this.table.locator('tbody tr').first();
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
