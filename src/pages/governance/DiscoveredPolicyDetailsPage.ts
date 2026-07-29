import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { GOV_DISCOVERED_POLICY_DETAILS } from '@constants/governance';

/**
 * Discovered policy details page (Clusters tab).
 *
 * Reached by clicking a discovered policy name from
 * Governance > Discovered policies tab.
 */
export class DiscoveredPolicyDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async openClustersTab(): Promise<void> {
    await this.page
      .getByRole('tab', { name: GOV_DISCOVERED_POLICY_DETAILS.tabs.clusters })
      .click();
    await this.waitForLoad(30_000);
  }

  getClusterRow(clusterName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: clusterName });
  }

  getLabelCountTag(clusterName: string): Locator {
    return this.getClusterRow(clusterName).getByText(/\d+ labels?/);
  }

  getLabelPopover(): Locator {
    return this.page
      .locator('[role="dialog"], [role="tooltip"]')
      .first();
  }

  getLabelFilterButton(): Locator {
    return this.page.getByRole('button', {
      name: GOV_DISCOVERED_POLICY_DETAILS.labelFilterText,
      exact: true,
    });
  }

  getLabelFilterOption(labelKey: string): Locator {
    const item = this.page
      .locator('.pf-v6-c-menu__list-item')
      .filter({ hasText: labelKey });
    return item.locator('.pf-v6-c-check__input, input[type="checkbox"]').first();
  }

  async clearFilters(): Promise<void> {
    await this.page.getByRole('button', { name: /clear all filters/i }).click();
    await this.waitForLoad(30_000);
  }

  async getClusterLabelsCell(clusterName: string): Promise<Locator> {
    const row = this.getClusterRow(clusterName);
    const headers = this.page.locator('th');
    const headerCount = await headers.count();
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).textContent();
      if (text?.trim() === 'Labels') {
        return row.locator('td').nth(i);
      }
    }
    return row.locator('td:has-text("Labels")');
  }
}
