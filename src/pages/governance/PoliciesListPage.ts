import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { GOVERNANCE_ROUTES, POLICY_LIST } from '@constants/governance';
import { pageUrlPathnameEquals } from '@lib/navigation';

/**
 * Governance → **Policies** tab / list.
 */
export class PoliciesListPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  getPoliciesTab(): Locator {
    return this.page.getByRole('tab', { name: POLICY_LIST.policiesTabLabel }).first();
  }

  getCreatePolicyButton(): Locator {
    return this.page.getByRole('button', { name: POLICY_LIST.createPolicyButtonLabel });
  }

  async gotoGovernanceOverview(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, GOVERNANCE_ROUTES.governanceOverview)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${GOVERNANCE_ROUTES.governanceOverview}`, {
      waitUntil: 'domcontentloaded',
    });
    await this.waitForLoad();
  }

  async gotoPoliciesList(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, GOVERNANCE_ROUTES.policiesList)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${GOVERNANCE_ROUTES.policiesList}`, {
      waitUntil: 'domcontentloaded',
    });
    await this.waitForLoad();
  }

  async openPoliciesTab(): Promise<void> {
    await this.getPoliciesTab().click();
    await this.waitForLoad();
  }

  async clickCreatePolicy(): Promise<void> {
    await this.getCreatePolicyButton().click();
    await this.waitForLoad();
  }
}
