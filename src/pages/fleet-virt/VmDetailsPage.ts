import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

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

  async clickTab(tabName: string): Promise<void> {
    await this.page.getByRole('link', { name: tabName, exact: true }).click();
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
}
