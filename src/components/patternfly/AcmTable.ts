import { Page, Locator, expect } from '@playwright/test';
import { SELECTORS } from '@constants/selectors';
import { acmToolbarSearchLocator } from '@utils/acm-locators';

/**
 * PatternFly-oriented table primitive for ACM list pages (search, rows by OUIA id).
 * Domain-specific tables extend this (e.g. ApplicationsTable).
 */
export class AcmTable {
  private readonly searchInput: Locator;

  constructor(protected readonly page: Page) {
    this.searchInput = acmToolbarSearchLocator(page);
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
    await expect(
      this.page.getByText(/no results match the filter criteria/i)
    ).toBeVisible();
  }

  async clickRow(ouiaId: string): Promise<void> {
    await this.getRow(ouiaId).click();
  }
}
