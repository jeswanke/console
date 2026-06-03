import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { GOV_PLACEMENT_ROUTES, GOV_PLACEMENT_DETAILS } from '@constants/governance';

/**
 * Placement details page.
 *
 * Route: /multicloud/infrastructure/clusters/placements/details/{namespace}/{name}
 * Contains: Details section, "Used in" section with Governance table.
 */
export class PlacementDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(namespace: string, name: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${GOV_PLACEMENT_ROUTES.details(namespace, name)}`);
    await this.waitForLoad(45_000);
  }

  getPageHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  getUsedInContainer(): Locator {
    return this.page.locator('#placement-used-in');
  }

  getGovernanceHeading(): Locator {
    return this.getUsedInContainer().getByText(
      GOV_PLACEMENT_DETAILS.governance.heading,
      { exact: true }
    );
  }

  getGovernanceTable(): Locator {
    return this.getUsedInContainer().locator('table').first();
  }

  async verifyGovernanceReference(name: string, type: string): Promise<void> {
    const table = this.getGovernanceTable();
    const row = table.getByRole('row').filter({
      has: this.page.getByRole('link', { name, exact: true }),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText(type);
  }
}
