import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { GOVERNANCE_ROUTES, POLICY_SET_LIST } from '@constants/governance';
import { pageUrlPathnameEquals } from '@lib/navigation';

/**
 * Governance → **Policy sets** tab.
 */
export class PolicySetsListPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  getPolicySetsTab(): Locator {
    return this.page.getByRole('tab', { name: POLICY_SET_LIST.policySetsTabLabel }).first();
  }

  getCreatePolicySetLink(): Locator {
    return this.page.getByRole('link', { name: POLICY_SET_LIST.createPolicySetLinkLabel });
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

  async openPolicySetsTab(): Promise<void> {
    await this.getPolicySetsTab().click();
    await this.waitForLoad();
  }

  async clickCreatePolicySet(): Promise<void> {
    await this.getCreatePolicySetLink().click();
    await this.waitForLoad();
  }
}
