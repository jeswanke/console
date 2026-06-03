import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { GOV_ROUTES, GOV_POLICY_DETAILS } from '@constants/governance';

/**
 * Policy details page.
 *
 * Route: /multicloud/governance/policies/details/{namespace}/{name}
 * Contains: Policy details section with fields (Name, Namespace, Placement, etc.).
 */
export class PolicyDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(namespace: string, name: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${GOV_ROUTES.policyDetails(namespace, name)}`);
    await this.waitForLoad(30_000);
  }

  getPageHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  getDetailsTab(): Locator {
    return this.page.getByRole('tab', { name: GOV_POLICY_DETAILS.tabs.details });
  }

  getResultsTab(): Locator {
    return this.page.getByRole('tab', { name: GOV_POLICY_DETAILS.tabs.results });
  }

  getDetailFieldValue(fieldLabel: string): Locator {
    const term = this.page.getByRole('term').filter({ hasText: fieldLabel });
    return term.locator('..').getByRole('definition');
  }

  getPlacementLink(): Locator {
    return this.getDetailFieldValue(GOV_POLICY_DETAILS.fields.placement)
      .getByRole('link')
      .first();
  }
}
