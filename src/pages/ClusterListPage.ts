import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ClusterListPage extends BasePage {
  private readonly createClusterButton: Locator;
  private readonly clusterTable: Locator;
  private readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.createClusterButton = page.getByRole('button', { name: 'Create cluster' });
    this.clusterTable = page.getByRole('grid', { name: 'Clusters' });
    this.searchInput = page.getByPlaceholder('Search');
  }

  async goto() {
    await super.goto('/multicloud/clusters');
  }

  async searchCluster(name: string) {
    await this.searchInput.fill(name);
    await this.waitForLoad();
  }

  async getClusterRow(name: string) {
    return this.clusterTable.getByRole('row', { name });
  }

  async verifyClusterVisible(name: string) {
    await expect(this.clusterTable.getByRole('row', { name })).toBeVisible();
  }
}

