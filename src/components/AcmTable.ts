import { Page, Locator, expect } from '@playwright/test';
import { SELECTORS } from '@constants/selectors';

/**
 * Reusable ACM Table component with search functionality.
 * Used across Clusters, Cluster Sets, Applications, Policies, etc.
 */
export class AcmTable {
  private readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.locator(SELECTORS.common.searchInput);
  }

  async search(text: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(text);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  /** Get row by OUIA component ID */
  getRow(ouiaId: string): Locator {
    return this.page.locator(SELECTORS.common.tableRow(ouiaId));
  }

  async verifyRowVisible(ouiaId: string): Promise<void> {
    await expect(this.getRow(ouiaId)).toBeVisible();
  }

  async verifyRowNotVisible(ouiaId: string): Promise<void> {
    await expect(this.getRow(ouiaId)).not.toBeVisible();
  }

  async verifyEmpty(): Promise<void> {
    await expect(this.page.getByText('No results found')).toBeVisible();
  }

  async clickRow(ouiaId: string): Promise<void> {
    await this.getRow(ouiaId).click();
  }
}

