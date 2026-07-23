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

  // ---------------------------------------------------------------------------
  // Console tab
  // ---------------------------------------------------------------------------

  getVncConsoleDropdown(): Locator {
    return this.page.getByRole('button', { name: 'VNC console' });
  }

  getGuestLoginCredentials(): Locator {
    return this.page.getByRole('heading', { name: 'Guest login credentials' });
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

  // ---------------------------------------------------------------------------
  // Snapshots tab
  // ---------------------------------------------------------------------------

  getSnapshotsHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Snapshots', level: 1 });
  }

  getSnapshotsList(): Locator {
    return this.getSnapshotsHeading();
  }

  // ---------------------------------------------------------------------------
  // Configuration tab (has sub-navigation)
  // ---------------------------------------------------------------------------

  getConfigurationTab(): Locator { return this.page.getByRole('link', { name: 'Configuration' }); }

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

  async clickActionButton(action: 'start' | 'stop' | 'pause' | 'restart'): Promise<void> {
    const buttonMap = {
      start: FLEET_VIRT_VM_ACTIONS.startButton,
      stop: FLEET_VIRT_VM_ACTIONS.stopButton,
      pause: FLEET_VIRT_VM_ACTIONS.pauseButton,
      restart: FLEET_VIRT_VM_ACTIONS.restartButton,
    };
    await this.page.locator(buttonMap[action]).click();
    const confirmBtn = this.page.locator(FLEET_VIRT_VM_ACTIONS.confirmAction);
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
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
      await expect(this.page.getByRole('menuitem', { name: /Delete/ })).toBeHidden({ timeout: 3000 });
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
