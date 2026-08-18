import { Page, Locator, expect } from '@playwright/test';
import { SELECTORS } from '@constants/selectors';
import { acmToolbarSearchLocator } from '@components/patternfly/AcmSearchInput';

/**
 * PatternFly-oriented table primitive for ACM list pages (search, rows by OUIA id).
 * Domain-specific tables extend this (e.g. ApplicationsTable).
 *
 * Pass `ariaLabel` to scope locators to a specific grid. Console AcmTable still
 * defaults to `aria-label="Simple Table"` unless a page overrides it.
 */
export class AcmTable {
  private readonly searchInput: Locator;

  constructor(
    protected readonly page: Page,
    /** Accessible name of the PatternFly grid (AcmTable `aria-label`). */
    protected readonly ariaLabel?: string
  ) {
    this.searchInput = acmToolbarSearchLocator(page);
  }

  /** Root grid for this table when `ariaLabel` was provided. */
  getGrid(): Locator {
    if (this.ariaLabel) {
      return this.page.getByRole('grid', { name: this.ariaLabel });
    }
    return this.page.getByRole('grid').first();
  }

  async search(text: string): Promise<void> {
    // `fill` replaces value; PF SearchInput can be flaky with `clear()` alone.
    await this.searchInput.fill(text);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }

  /** Get row by OUIA component ID */
  getRow(ouiaId: string): Locator {
    return this.page.locator(SELECTORS.common.tableRow(ouiaId));
  }

  async verifyRowVisible(ouiaId: string): Promise<void> {
    await expect(this.getRow(ouiaId)).toBeVisible();
  }

  async verifyRowNotVisible(ouiaId: string): Promise<void> {
    await expect(this.getRow(ouiaId)).toBeHidden();
  }

  async verifyEmpty(): Promise<void> {
    // AcmTable renders `AcmEmptyState` with title in an h4 (PF EmptyStateHeader).
    await expect(this.page.getByRole('heading', { name: /no results found/i })).toBeVisible();
    await expect(this.page.getByText(/no results match the filter criteria/i )).toBeVisible();
  }

  async clickRow(ouiaId: string): Promise<void> {
    await this.getRow(ouiaId).click();
  }

  /**
   * Prefer `th[data-label]` over `getByRole('columnheader', { name, exact: true })`.
   * Sorted / help-icon headers (PF Th + info) expose a compound accessible name
   * (e.g. "Name" + helper aria-label), so exact role-name matching fails.
   */
  async verifyColumnHeaderVisible(columnName: string): Promise<void> {
    const scope = this.ariaLabel ? this.getGrid() : this.page;
    await expect(scope.locator(`th[data-label="${columnName}"]`)).toBeVisible();
  }

  async verifyColumnHeaderNotVisible(columnName: string): Promise<void> {
    const scope = this.ariaLabel ? this.getGrid() : this.page;
    await expect(scope.locator(`th[data-label="${columnName}"]`)).toBeHidden();
  }

  async verifyColumnOrder(expectedOrder: string[]): Promise<void> {
    const headerRoot = this.ariaLabel ? this.getGrid() : this.page;
    const headers = await headerRoot.locator('thead th').allTextContents();

    const indices: number[] = [];
    for (const column of expectedOrder) {
      const index = headers.findIndex((h) => h.includes(column));
      if (index === -1) {
        throw new Error(`Column "${column}" not found in table headers: ${headers.join(', ')}`);
      }
      indices.push(index);
    }

    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  }
}
