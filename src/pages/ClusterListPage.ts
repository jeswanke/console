import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { OcCliService } from '@services/OcCliService';

export class ClusterListPage extends BasePage {
  private readonly createClusterButton: Locator;
  private readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.createClusterButton = page.getByRole('button', { name: 'Create cluster' });
    // Use aria-label like Cypress does
    this.searchInput = page.locator('[aria-label="Search input"]');
  }

  async goto() {
    const oc = new OcCliService();
    const consoleUrl = await oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}/multicloud/infrastructure/clusters/managed`);
    await this.waitForLoad();
  }

  async searchCluster(name: string) {
    // Clear and type like Cypress does
    await this.searchInput.clear();
    await this.searchInput.fill(name);
    await this.waitForLoad();
  }

  /**
   * Get a cluster row using OUIA component ID (PatternFly standard)
   * Matches Cypress: tr[data-ouia-component-id="${clusterName}"]
   */
  getClusterRow(name: string): Locator {
    return this.page.locator(`tr[data-ouia-component-id="${name}"]`);
  }

  async verifyClusterVisible(name: string, timeout = 30000) {
    const row = this.getClusterRow(name);
    await expect(row).toBeVisible({ timeout });
  }

  async verifyClusterNotVisible(name: string, timeout = 10000) {
    const row = this.getClusterRow(name);
    await expect(row).not.toBeVisible({ timeout });
  }

  async verifyNoResultsFound() {
    await expect(this.page.getByText('No results found')).toBeVisible();
  }
}
