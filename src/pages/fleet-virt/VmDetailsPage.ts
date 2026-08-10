import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { FLEET_VIRT_VM_ACTIONS } from '@constants/fleet-virt';

/**
 * Fleet Virtualization VM Details page.
 *
 * Tabs: Overview, Metrics, YAML, Configuration, Events, Console, Snapshots, Diagnostics
 * Configuration sub-tabs: Details, Environment, Storage, Network, Scheduling, SSH
 *
 * Source: kubevirt-ui/kubevirt-plugin
 * Per architecture doc: page objects expose locators, tests assert.
 */
export class VmDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  getTabLink(tabName: string): Locator {
    return this.page.getByRole('link', { name: tabName, exact: true });
  }

  async dismissWelcomeModal(): Promise<void> {
    const skipTourBtn = this.page.getByRole('button', { name: 'Skip tour' });
    const closeBtn = this.page.getByRole('dialog').getByRole('button', { name: 'Close' });
    try {
      const target = skipTourBtn.or(closeBtn);
      await target.first().waitFor({ state: 'visible', timeout: 5000 });
      await target.first().click();
    } catch {
      // Modal not present — expected for most users
    }
  }

  async clickTab(tabName: string): Promise<void> {
    await this.getTabLink(tabName).click();
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Page heading and status
  // ---------------------------------------------------------------------------

  getPageHeading(): Locator {
    return this.page.getByRole('heading', { name: /^VM /, level: 1 });
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  getActionsDropdown(): Locator {
    return this.page.getByRole('button', { name: 'Actions' });
  }

  async openActions(): Promise<void> {
    await this.getActionsDropdown().click();
  }

  getActionsMenu(): Locator {
    return this.page.getByRole('menu');
  }

  getActionMenuItem(actionName: string): Locator {
    return this.page.getByRole('menuitem', { name: actionName });
  }

  getActionSubmenuButton(name: string): Locator {
    return this.page.getByRole('menu').getByRole('button', { name });
  }

  // ---------------------------------------------------------------------------
  // Console tab
  // ---------------------------------------------------------------------------

  getVncConsoleDropdown(): Locator {
    return this.page.getByRole('button', { name: 'VNC console' });
  }

  getGuestLoginCredentials(): Locator {
    return this.page.getByRole('heading', { name: 'Guest login credentials' });
  }

  getVncDisconnectedText(): Locator {
    return this.page.getByText('Click Connect to open the VNC console.');
  }

  getVncConnectButton(): Locator {
    return this.page.getByRole('button', { name: 'Connect', exact: true });
  }

  getVncDisconnectButton(): Locator {
    return this.page.getByRole('button', { name: 'Disconnect', exact: true });
  }

  // ---------------------------------------------------------------------------
  // Events tab
  // ---------------------------------------------------------------------------

  getEventsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Events', level: 2 });
  }

  getEventsSection(): Locator {
    return this.getEventsHeading();
  }

  getEventEntries(): Locator {
    return this.page
      .locator('[class*="event"]')
      .or(this.page.getByText(/Created|Started|Scheduled/i));
  }

  // ---------------------------------------------------------------------------
  // Snapshots tab
  // ---------------------------------------------------------------------------

  getSnapshotsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Snapshots', level: 1 });
  }

  getSnapshotsList(): Locator {
    return this.getSnapshotsHeading();
  }

  getTakeSnapshotButton(): Locator {
    return this.page.getByRole('button', { name: 'Take snapshot' });
  }

  // ---------------------------------------------------------------------------
  // Overview tab — resource links
  // ---------------------------------------------------------------------------

  getPodLink(): Locator {
    return this.page.getByRole('link', { name: /virt-launcher/i });
  }

  getNodeLink(): Locator {
    return this.page.getByRole('link', { name: /worker|master|node/i });
  }

  // ---------------------------------------------------------------------------
  // Overview tab — metrics
  // ---------------------------------------------------------------------------

  getMetricsChart(): Locator {
    return this.page.locator('[class*="chart"]').or(this.page.getByText(/CPU|Memory/i));
  }

  // ---------------------------------------------------------------------------
  // YAML tab
  // ---------------------------------------------------------------------------

  getYamlEditor(): Locator {
    return this.page.getByRole('textbox', { name: /Editor content/i });
  }

  // ---------------------------------------------------------------------------
  // Configuration tab (has sub-navigation)
  // ---------------------------------------------------------------------------

  getConfigurationTab(): Locator { return this.page.getByRole('link', { name: 'Configuration' }); }

  getConfigSubTab(name: string): Locator {
    return this.page.getByRole('tab', { name });
  }

  async clickConfigSubTab(name: string): Promise<void> {
    await this.getConfigSubTab(name).click();
    await this.waitForLoad();
  }

  getStorageContent(): Locator {
    return this.page.getByText(/Disk/i).or(this.page.getByText(/No disks/i));
  }

  getAddDiskButton(): Locator {
    return this.page.getByRole('button', { name: 'Add', exact: true });
  }

  getNetworkContent(): Locator {
    return this.page.getByText(/Interface/i).or(this.page.getByText(/Network/i));
  }

  // ---------------------------------------------------------------------------
  // Migration actions
  // ---------------------------------------------------------------------------

  async openMigrationMenu(): Promise<void> {
    await expect(async () => {
      await this.openActions();
      const migrationBtn = this.page.getByRole('button', { name: 'Migration' }).last();
      await migrationBtn.click({ timeout: 5000 });
    }).toPass({ intervals: [2000, 3000], timeout: 30000 });
  }

  getCrossClusterMigrationItem(): Locator {
    return this.page.getByRole('menuitem', { name: 'Cross cluster migration' });
  }

  // ---------------------------------------------------------------------------
  // VM action buttons
  // ---------------------------------------------------------------------------

  getStartButton(): Locator {
    return this.page.locator(FLEET_VIRT_VM_ACTIONS.startButton);
  }

  getStopButton(): Locator {
    return this.page.locator(FLEET_VIRT_VM_ACTIONS.stopButton);
  }

  getPauseButton(): Locator {
    return this.page.locator(FLEET_VIRT_VM_ACTIONS.pauseButton);
  }

  getRestartButton(): Locator {
    return this.page.locator(FLEET_VIRT_VM_ACTIONS.restartButton);
  }

  getStatusLabel(): Locator {
    return this.page.locator(FLEET_VIRT_VM_ACTIONS.statusLabel);
  }

  /**
   * Get the VM status text from the details page.
   * Fleet Virt renders status as an icon (img alt) + optional text in the heading,
   * and also as a button in the Details description list.
   * This method uses the Details panel "Status" field (most reliable) with
   * a fallback to the heading's accessible content (text nodes + img alt).
   */
  async getStatusFromHeading(): Promise<string> {
    // Primary: get status from the Details description list button
    // Structure: <dt>Status</dt> <dd><button>Provisioning</button></dd>
    const statusButton = this.page
      .locator('dt')
      .filter({ hasText: /^Status$/ })
      .locator('xpath=following-sibling::dd[1]//button')
      .first();
    const btnText = await statusButton
      .innerText({ timeout: 5000 })
      .catch(() => '');
    if (btnText.trim()) return btnText.trim();

    // Fallback: extract status from heading textContent
    // Heading format: "VM <vm-name> <status>"
    const heading = this.getPageHeading();
    const headingText = await heading.textContent().catch(() => '');
    const normalized = (headingText ?? '').replace(/\s+/g, ' ').trim();
    const match = normalized.match(/^VM\s+\S+\s+(.+)$/);
    return match?.[1]?.trim() ?? '';
  }

  async clickActionButton(action: 'start' | 'stop' | 'pause' | 'restart'): Promise<void> {
    const buttonMap = {
      start: FLEET_VIRT_VM_ACTIONS.startButton,
      stop: FLEET_VIRT_VM_ACTIONS.stopButton,
      pause: FLEET_VIRT_VM_ACTIONS.pauseButton,
      restart: FLEET_VIRT_VM_ACTIONS.restartButton,
    };
    await this.page.locator(buttonMap[action]).click();
    const confirmBtn = this.page.locator(FLEET_VIRT_VM_ACTIONS.confirmAction);
    try {
      await confirmBtn.waitFor({ state: 'visible', timeout: 3000 });
      await confirmBtn.click();
    } catch {
      // No confirmation dialog — action executed directly
    }
  }

  // ---------------------------------------------------------------------------
  // Diagnostics tab
  // ---------------------------------------------------------------------------

  getDiagnosticsContent(textPattern: RegExp): Locator {
    return this.page.getByText(textPattern);
  }

  getDiagnosticsConditionLabel(conditionName: string): Locator {
    return this.page.getByText(conditionName).first();
  }

  getDiagnosticsConditionValue(conditionName: string): Locator {
    return this.page
      .locator('tr', { has: this.page.getByText(conditionName) })
      .getByText('True')
      .first();
  }

  // ---------------------------------------------------------------------------
  // Dashboard utilization (Fleet Virt Overview tab)
  // ---------------------------------------------------------------------------

  getUtilizationCard(): Locator {
    return this.page.locator('.VirtualMachinesOverviewTabUtilization--main');
  }

  getUtilSummary(metric: string): Locator {
    return this.page.getByTestId(`util-summary-${metric}`);
  }

  getErrorBanner(): Locator {
    return this.page.getByText('Something wrong happened');
  }

  // ---------------------------------------------------------------------------
  // Clone and delete
  // ---------------------------------------------------------------------------

  async clickCloneAction(): Promise<void> {
    await this.openActions();
    await this.getActionMenuItem('Clone').click();
  }

  // ---------------------------------------------------------------------------
  // Delete VM (TC: RHACM4K-60772)
  // ---------------------------------------------------------------------------

  async clickDeleteAction(): Promise<void> {
    await expect(async () => {
      await this.page.keyboard.press('Escape');
      await this.getActionsDropdown().waitFor({ state: 'visible', timeout: 5000 });
      await this.openActions();
      const deleteItem = this.page.getByRole('menuitem', { name: /Delete/ });
      await expect(deleteItem).toBeEnabled({ timeout: 5000 });
      await deleteItem.click({ timeout: 5000 });
    }).toPass({ intervals: [2000, 3000], timeout: 30000 });
  }

  async confirmDelete(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  }
}
