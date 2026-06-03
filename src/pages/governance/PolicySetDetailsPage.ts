import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';

/**
 * Policy set details panel (drawer).
 *
 * Opened by clicking a policy set card on the Governance > Policy sets tab.
 * Not a standalone page — the drawer renders inside the governance list view.
 */
export class PolicySetDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  getDetailsPanel(): Locator {
    return this.page.locator('.pf-v6-c-drawer__panel').first();
  }

  getPlacementLink(placementName: string): Locator {
    return this.getDetailsPanel().getByRole('link', { name: placementName });
  }
}
