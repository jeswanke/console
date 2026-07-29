import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  FLEET_VIRT_ROUTES,
  FLEET_VIRT_PAGE,
  FLEET_VIRT_SEARCH,
  FLEET_VIRT_ADVANCED_SEARCH,
} from '@constants/fleet-virt';

/**
 * Fleet Virtualization VM list page.
 *
 * Per architecture doc: page objects expose locators, tests assert.
 * shouldLoad() is a wait guard (acceptable use of expect in page object).
 */
export class FleetVirtPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(
      `${consoleUrl}${FLEET_VIRT_ROUTES.vmList}?perspective=fleet-virtualization-perspective`,
    );
    await this.shouldLoad();
  }

  /**
   * Wait guard: retry with page reload if h1 doesn't appear.
   * Fleet Virt page can be slow due to search-cluster-proxy init.
   */
  async shouldLoad(): Promise<void> {
    await expect(async () => {
      const h1 = this.page.locator('h1');
      if (!(await h1.isVisible())) {
        await this.page.reload();
      }
      await expect(h1).toBeVisible({ timeout: 10000 });
    }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 120_000 });
  }

  async gotoVmTab(): Promise<void> {
    await this.page.keyboard.press('Escape');
    const vmTab = this.page.getByRole('tab', { name: 'Virtual machines' });
    await vmTab.click();
    await expect(vmTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
  }

  async openAdvancedSearch(): Promise<void> {
    const advSearchButton = this.page.locator(FLEET_VIRT_ADVANCED_SEARCH.openButton);

    if (await advSearchButton.isVisible()) {
      await advSearchButton.click();
    } else {
      const searchInput = this.page.locator(FLEET_VIRT_SEARCH.searchInput).first();
      const siblingButton = searchInput.locator('xpath=following::button[1]');
      await siblingButton.click();
    }

    await expect(
      this.page.getByRole('heading', { name: 'Advanced search', level: 1 })
    ).toBeVisible({ timeout: 10000 });
  }

  getCreateVmButton(): Locator {
    return this.page.getByRole('button', { name: 'Create VirtualMachine' });
  }

  getNoVMsEmptyState(): Locator {
    return this.page.getByText(FLEET_VIRT_PAGE.emptyState.noVMs);
  }

  getPageHeading(): Locator {
    return this.page.locator('[data-test="page-heading"] h1');
  }

  /**
   * Extract VM name and namespace from the first row in the VM table.
   * VirtualizedTable cells prepend column type prefixes (e.g. "VirtualMachineVM")
   * which are stripped here.
   */
  async getFirstVmInfo(): Promise<{ name: string; namespace: string }> {
    const grid = this.page.getByRole('grid').last();
    const firstRow = grid.getByRole('row').filter({ has: this.page.getByRole('gridcell') }).first();
    await expect(firstRow).toBeVisible({ timeout: 30000 });

    const nameCell = firstRow.getByRole('gridcell').nth(1);
    const nameText = (await nameCell.textContent()) || '';
    const name = nameText.replace(/^VirtualMachineVM/i, '').trim();

    const nsCell = firstRow.getByRole('gridcell').nth(3);
    const nsText = (await nsCell.textContent()) || '';
    const namespace = nsText.replace(/^NamespaceNS/i, '').trim();

    return { name, namespace };
  }

  async gotoVmDetails(cluster: string, namespace: string, vmName: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(
      `${consoleUrl}/fleet-virtualization/kubevirt.io~v1~VirtualMachine/cluster/${cluster}/ns/${namespace}/${vmName}?perspective=fleet-virtualization-perspective`
    );
    await this.waitForLoad();
  }

  async clearAllFilters(): Promise<void> {
    const clearButton = this.page.getByRole('button', { name: 'Clear all filters' });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.waitForLoad();
    }
  }

  async clickBackToVmList(): Promise<void> {
    await this.page.getByRole('button', { name: 'Back to VirtualMachines list' }).click();
    await this.shouldLoad();
  }

  getVmRow(vmName: string): Locator {
    return this.page
      .getByRole('grid')
      .getByRole('row')
      .filter({ hasText: vmName });
  }

  getVmTableRows(): Locator {
    return this.page.getByRole('grid', { name: 'VirtualMachines table' }).getByRole('row');
  }

  async clickFirstVmInTable(): Promise<void> {
    const grid = this.page.getByRole('grid', { name: 'VirtualMachines table' });
    const firstLink = grid.getByRole('link').first();
    await firstLink.click();
  }

  getVmRow(vmName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: vmName });
  }

  // ---------------------------------------------------------------------------
  // Bulk VM selection and actions
  // ---------------------------------------------------------------------------

  async selectVmByCheckbox(vmName: string): Promise<void> {
    const row = this.page.getByRole('row').filter({ hasText: vmName });
    const checkbox = row.getByRole('checkbox');
    await expect(checkbox).toBeVisible({ timeout: 15000 });
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.click();
    }
  }

  async selectMultipleVms(vmNames: string[]): Promise<void> {
    for (const vmName of vmNames) {
      await this.selectVmByCheckbox(vmName);
      await this.page.waitForTimeout(500);
    }
    await expect(this.page.getByText(/\d+ selected/)).toBeVisible({ timeout: 10000 });
  }

  async openBulkActions(): Promise<void> {
    await expect(this.page.getByText(/\d+ selected/)).toBeVisible({ timeout: 10000 });
    const tabPanel = this.page.getByRole('tabpanel', { name: 'Virtual machines' });
    const actionsBtn = tabPanel.getByRole('button', { name: 'Actions', exact: true }).first();
    await expect(actionsBtn).toBeEnabled({ timeout: 10000 });
    await actionsBtn.click();
  }

  /**
   * Trigger bulk cross-cluster migration via flyout menu.
   * PF6 flyout menus require hover on parent to reveal the submenu.
   */
  async triggerBulkCrossClusterMigration(): Promise<void> {
    await this.openBulkActions();
    const menu = this.page.getByRole('menu');
    const migrationBtn = menu.getByRole('button', { name: 'Migration', exact: true });
    await migrationBtn.hover();
    const crossClusterItem = this.page.getByRole('menuitem', { name: /Cross.?cluster/i });
    await expect(crossClusterItem).toBeVisible({ timeout: 5000 });
    await crossClusterItem.click();
  }

  /**
   * Trigger a bulk control action (start/stop/pause/unpause/restart).
   * PF6 flyout menus require hover on parent to reveal the submenu.
   */
  async triggerBulkControlAction(action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart'): Promise<void> {
    await this.openBulkActions();
    const menu = this.page.getByRole('menu');
    const controlBtn = menu.getByRole('button', { name: 'Control', exact: true });
    await controlBtn.hover();
    const labelMap: Record<string, string> = {
      start: 'Start', stop: 'Stop', pause: 'Pause', unpause: 'Unpause', restart: 'Restart',
    };
    const actionItem = this.page.getByRole('menuitem', { name: labelMap[action], exact: true });
    await expect(actionItem).toBeVisible({ timeout: 5000 });
    await actionItem.click();
  }
}
