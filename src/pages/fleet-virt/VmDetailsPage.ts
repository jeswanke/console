import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { FLEET_VIRT_VM_ACTIONS } from '@constants/fleet-virt';

/**
 * Fleet Virtualization VM Details page.
 * Source: kubevirt-ui/kubevirt-plugin
 */
export class VmDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async clickTab(tabName: string): Promise<void> {
    await this.page.getByRole('link', { name: tabName, exact: true }).click();
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Page heading and status
  // ---------------------------------------------------------------------------

  getPageHeading(): Locator {
    return this.page.locator('h1').filter({ hasText: 'VM' });
  }

  // ---------------------------------------------------------------------------
  // Actions dropdown
  // ---------------------------------------------------------------------------

  getActionsDropdown(): Locator {
    return this.page.locator(FLEET_VIRT_VM_ACTIONS.dropdown);
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

  getEventsSection(): Locator {
    return this.page.getByRole('heading', { name: 'Events', level: 2 });
  }

  // ---------------------------------------------------------------------------
  // Snapshots tab
  // ---------------------------------------------------------------------------

  getSnapshotsList(): Locator {
    return this.page.getByRole('heading', { name: 'Snapshots', level: 1 });
  }

  // ---------------------------------------------------------------------------
  // Configuration tab
  // ---------------------------------------------------------------------------

  getConfigurationTab(): Locator {
    return this.page.getByRole('link', { name: 'Configuration' });
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
}
