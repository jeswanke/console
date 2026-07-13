/* Copyright Contributors to the Open Cluster Management project */

import { Page, Locator, expect } from '@playwright/test';
import { AcmTable } from '@components/patternfly/AcmTable';
import { GOV_TABLE_COLUMNS, GOV_TOOLBAR, GOV_FILTER } from '@constants/governance';
import { PF_SPINNER, PF_SKELETON } from '@constants/selectors';

/**
 * Governance policies table — extends AcmTable with filter, export, and cell access.
 *
 * Mirrors the ApplicationsTable pattern for filter/export interactions.
 */
export class GovernanceTable extends AcmTable {
  private readonly drawerBody: Locator;

  constructor(page: Page) {
    super(page);
    this.drawerBody = page.locator('.pf-v6-c-drawer__body').first();
  }

  // ---------------------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------------------

  getFilterButton(): Locator {
    return this.drawerBody.getByRole('button', { name: GOV_FILTER.filterButtonLabel }).first();
  }

  async openFilter(): Promise<void> {
    await this.getFilterButton().click();
  }

  async selectFilterOption(optionLabel: string): Promise<void> {
    const escaped = optionLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page.getByRole('menuitem', { name: new RegExp(`^${escaped}\\s`) }).click();
  }

  async closeFilter(): Promise<void> {
    await this.getFilterButton().click();
  }

  /**
   * Apply one or more filter options: opens filter, selects each option, then closes.
   * Matches Cypress `doFilter` 1:1.
   */
  async applyFilter(searchTerm: string, filterOptions: string[]): Promise<void> {
    await this.search(searchTerm);
    await expect(this.page.locator(PF_SPINNER)).toHaveCount(0, { timeout: 30_000 });
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0, { timeout: 30_000 });
    await this.openFilter();
    for (const option of filterOptions) {
      await this.selectFilterOption(option);
    }
    await this.closeFilter();
  }

  getClearAllFiltersButton(): Locator {
    return this.page.getByRole('button', {
      name: GOV_TOOLBAR.clearAllFiltersButtonName,
      exact: true,
    });
  }

  async clearAllFilters(): Promise<void> {
    const clearButton = this.getClearAllFiltersButton();
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
    }
  }

  // ---------------------------------------------------------------------------
  // Export CSV
  // ---------------------------------------------------------------------------

  getExportButton(): Locator {
    return this.page.locator(`button[aria-label="${GOV_TOOLBAR.exportButtonAriaLabel}"]`).first();
  }

  async clickExportCSV(): Promise<void> {
    await this.getExportButton().click();
    await this.page.getByRole('menuitem', { name: GOV_TOOLBAR.exportAllToCSVLabel }).click();
  }

  // ---------------------------------------------------------------------------
  // Rows and cells
  // ---------------------------------------------------------------------------

  getRowByName(policyName: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('link', { name: policyName, exact: true }) });
  }

  getCellByLabel(row: Locator, columnLabel: string): Locator {
    return row.locator(`td[data-label="${columnLabel}"]`);
  }

  getTable(): Locator {
    return this.page.locator('table.pf-v6-c-table.pf-m-compact');
  }

  getDataRows(): Locator {
    return this.getTable().locator('tbody tr');
  }

  async getDataRowCount(): Promise<number> {
    return this.getDataRows().count();
  }

  async verifyTableContainsText(text: string): Promise<void> {
    await expect(this.getTable().getByText(text, { exact: false }).first()).toBeVisible();
  }

  async verifyCellValue(
    row: Locator,
    column: keyof typeof GOV_TABLE_COLUMNS,
    expectedValue: string | RegExp
  ): Promise<void> {
    const cell = this.getCellByLabel(row, GOV_TABLE_COLUMNS[column]);
    if (typeof expectedValue === 'string') {
      await expect(cell).toContainText(expectedValue, { ignoreCase: true });
    } else {
      await expect(cell).toHaveText(expectedValue);
    }
  }
}
