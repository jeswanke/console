/* Copyright Contributors to the Open Cluster Management project */

import { Page, Locator, expect } from '@playwright/test';
import { AcmTable } from '@components/patternfly/AcmTable';
import {
  GOV_TABLE_COLUMNS,
  GOV_TOOLBAR,
  GOV_FILTER,
  GOV_POLICY_ACTIONS,
} from '@constants/governance';
import { PF_SPINNER, PF_SKELETON } from '@constants/selectors';

/**
 * Governance policies table — extends AcmTable with filter, export, row selection,
 * bulk actions, and kebab row actions.
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
  // Row selection
  // ---------------------------------------------------------------------------

  async selectRowByName(policyName: string): Promise<void> {
    const row = this.getRowByName(policyName);
    // PF6 hides the native <input> behind a styled <label>; force bypasses the visibility check
    // eslint-disable-next-line playwright/no-force-option
    await row.getByRole('checkbox').check({ force: true });
  }

  async selectAllVisibleRows(): Promise<void> {
    const checkboxes = this.getTable().locator('tbody input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      // PF6 hides the native <input> behind a styled <label>; force bypasses the visibility check
      // eslint-disable-next-line playwright/no-force-option
      await checkboxes.nth(i).check({ force: true });
    }
  }

  async deselectAllRows(): Promise<void> {
    const checkboxes = this.getTable().locator('tbody input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      // PF6 hides the native <input> behind a styled <label>; force bypasses the visibility check
      // eslint-disable-next-line playwright/no-force-option
      await checkboxes.nth(i).uncheck({ force: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk actions (toolbar dropdown)
  // ---------------------------------------------------------------------------

  getActionsDropdown(): Locator {
    return this.page.locator(`button#${GOV_POLICY_ACTIONS.actionsDropdownId}`);
  }

  async openActionsDropdown(): Promise<void> {
    const btn = this.getActionsDropdown();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }

  async clickBulkAction(action: string): Promise<void> {
    await this.openActionsDropdown();
    const lowerAction = action.toLowerCase();

    if (lowerAction === 'enable' || lowerAction === 'disable') {
      await this.page.locator(`#${GOV_POLICY_ACTIONS.statusGroupId}`).hover();
      // PF6 menu subitems may have pointer-events:none during open transition
      // eslint-disable-next-line playwright/no-force-option
      await this.page.locator(`#${lowerAction}`).click({ force: true });
    } else if (lowerAction === 'inform' || lowerAction === 'enforce') {
      await this.page.locator(`#${GOV_POLICY_ACTIONS.remediationGroupId}`).hover();
      // PF6 menu subitems may have pointer-events:none during open transition
      // eslint-disable-next-line playwright/no-force-option
      await this.page.locator(`#${lowerAction}-policy`).click({ force: true });
    } else {
      // PF6 menu subitems may have pointer-events:none during open transition
      // eslint-disable-next-line playwright/no-force-option
      await this.page.locator(`#${lowerAction}`).click({ force: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Individual row actions (kebab menu)
  // ---------------------------------------------------------------------------

  async openRowActions(policyName: string): Promise<void> {
    const kebab = this.page.locator(`[id="${policyName}-actions"]`);
    await kebab.scrollIntoViewIfNeeded();
    await kebab.click();
    const expanded = await kebab.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await kebab.click();
    }
  }

  async clickRowAction(policyName: string, action: string): Promise<void> {
    await this.openRowActions(policyName);
    const lowerAction = action.toLowerCase();

    if (lowerAction === 'enable' || lowerAction === 'disable') {
      await this.page.locator('#status-policy').hover();
      // PF6 menu subitems may have pointer-events:none during open transition
      // eslint-disable-next-line playwright/no-force-option
      await this.page.locator(`#${lowerAction}-policy`).click({ force: true });
    } else if (lowerAction === 'inform' || lowerAction === 'enforce') {
      await this.page.locator('#remediation-policy').hover();
      // PF6 menu subitems may have pointer-events:none during open transition
      // eslint-disable-next-line playwright/no-force-option
      await this.page.locator(`#${lowerAction}-policy`).click({ force: true });
    } else {
      // PF6 menu subitems may have pointer-events:none during open transition
      // eslint-disable-next-line playwright/no-force-option
      await this.page.locator(`#${lowerAction}-policy`).click({ force: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Action confirmation modals
  // ---------------------------------------------------------------------------

  async confirmActionModal(actionText: string): Promise<void> {
    const modal = this.page.getByRole('dialog').first();
    await expect(modal).toBeVisible({ timeout: 10_000 });
    const button = modal.getByRole('button', { name: new RegExp(actionText, 'i') });
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await modal.waitFor({ state: 'hidden', timeout: 30_000 });
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

  async verifyPolicyInListing(policyName: string): Promise<void> {
    await expect(this.getRowByName(policyName)).toBeVisible({ timeout: 30_000 });
  }

  async verifyPolicyNotInListing(policyName: string): Promise<void> {
    await expect(this.getRowByName(policyName)).not.toBeVisible({
      timeout: 30_000,
    });
  }
}
