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
    await this.page.goto(`${consoleUrl}${FLEET_VIRT_ROUTES.vmList}`);
    await this.shouldLoad();
  }

  /**
   * Wait guard: retry with page reload if h1 doesn't appear.
   * Fleet Virt page can be slow due to search-cluster-proxy init.
   */
  async shouldLoad(): Promise<void> {
    await expect(async () => {
      const h1 = this.page.locator('h1');
      const isVisible = await h1.isVisible().catch(() => false);
      if (!isVisible) {
        await this.page.reload();
      }
      await expect(h1).toBeVisible({ timeout: 10000 });
    }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 120_000 });
  }

  async gotoVmTab(): Promise<void> {
    const vmTab = this.page.getByRole('tab', { name: 'Virtual machines' });
    await vmTab.click();
    await expect(vmTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
  }

  async openAdvancedSearch(): Promise<void> {
    const advSearchButton = this.page.locator(FLEET_VIRT_ADVANCED_SEARCH.openButton);
    const isVisible = await advSearchButton.isVisible().catch(() => false);

    if (isVisible) {
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
    const firstRow = grid.getByRole('row').first();
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
      `${consoleUrl}/fleet-virtualization/kubevirt.io~v1~VirtualMachine/cluster/${cluster}/ns/${namespace}/${vmName}`
    );
    await this.waitForLoad();
  }

  async clearAllFilters(): Promise<void> {
    const clearButton = this.page.getByRole('button', { name: 'Clear all filters' });
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      await this.waitForLoad();
    }
  }

  async clickBackToVmList(): Promise<void> {
    await this.page.getByRole('button', { name: 'Back to VirtualMachines list' }).click();
    await this.shouldLoad();
  }

  getVmTableRows(): Locator {
    return this.page.getByRole('grid', { name: 'VirtualMachines table' }).getByRole('row');
  }

  async clickFirstVmInTable(): Promise<void> {
    const grid = this.page.getByRole('grid', { name: 'VirtualMachines table' });
    const firstLink = grid.getByRole('link').first();
    await firstLink.click();
  }
}
