import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { CLUSTER_ROUTES } from '@constants/cluster';

export class ClusterAddonsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService,
  ) {
    super(page);
  }

  async goto(namespace: string, name: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(
      `${consoleUrl}${CLUSTER_ROUTES.detailOverview(namespace, name)}`
    );
    await this.waitForLoad();
    await this.page.getByRole('tab', { name: 'Add-ons' }).click();
    await this.waitForLoad();
  }

  getAddonRow(addonName: string): Locator {
    return this.page.locator(`tr[data-ouia-component-id="${addonName}"]`);
  }

  async getAddonStatus(addonName: string): Promise<string> {
    const row = this.getAddonRow(addonName);
    return row.locator('td[data-label="Status"]').innerText();
  }

  async verifyAddonVisible(addonName: string): Promise<void> {
    await expect(this.getAddonRow(addonName)).toBeVisible();
  }

  async getAddonCount(): Promise<number> {
    return this.page.locator('table tbody tr').count();
  }

  async getAllAddonNames(): Promise<string[]> {
    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = await rows.nth(i).locator('td:first-child').innerText();
      names.push(name.trim());
    }
    return names;
  }
}
