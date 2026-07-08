import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';

/**
 * Fleet Virtualization VM Creation Wizard page.
 *
 * Route: /fleet-virtualization/vm-wizard/cluster/:cluster/ns/:namespace
 * Wizard steps: Deployment details → Guest OS → Boot source → Compute resources → Customization → Review and create
 */
export class VmCreationPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  private getNextButton(): Locator {
    return this.page.getByRole('button', { name: 'Next', exact: true });
  }

  async clickNext(): Promise<void> {
    await expect(this.getNextButton()).toBeEnabled({ timeout: 30000 });
    await this.getNextButton().click();
    await this.waitForLoad();
  }

  async selectGuestOS(osFamily: string, osType: string): Promise<void> {
    await this.page.getByText(osFamily).click();
    const dropdown = this.page.locator('button').filter({ hasText: /Select guest|cirros|fedora|rhel/ }).first();
    await dropdown.click();
    await this.page.getByRole('option', { name: osType, exact: true }).click();
  }

  async selectBootVolume(volumeName: string): Promise<void> {
    await expect(this.page.getByRole('row', { name: new RegExp(volumeName) })).toBeVisible({ timeout: 30000 });
    await this.page.getByRole('row', { name: new RegExp(volumeName) }).click();
  }

  async fillVmName(name: string): Promise<void> {
    const input = this.page.locator('#vm\\ name');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.clear();
    await input.fill(name);
  }

  getCreateVmButton(): Locator {
    return this.page.getByRole('button', { name: 'Create VirtualMachine' });
  }

  async clickCreateVm(): Promise<void> {
    await this.getCreateVmButton().click();
  }

  async createVmQuickPath(vmName: string): Promise<void> {
    await this.clickNext();
    await this.selectGuestOS('Other Linux', 'fedora');
    await this.clickNext();
    await this.selectBootVolume('fedora');
    await this.clickNext();
    await this.clickNext();
    await this.clickNext();
    await this.fillVmName(vmName);
    await this.clickCreateVm();
  }
}
