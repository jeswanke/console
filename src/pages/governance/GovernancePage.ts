import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { SELECTORS } from '@constants/selectors';
import { GOV_ROUTES, GOV_PAGE } from '@constants/governance';

/**
 * Governance main page (Policies list, Policy sets list).
 *
 * Route: /multicloud/governance
 * Contains: Overview, Policy sets, Policies, Discovered policies tabs.
 */
export class GovernancePage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${GOV_ROUTES.governance}`);
    await this.waitForLoad(30_000);
  }

  async openPoliciesTab(): Promise<void> {
    await this.page
      .getByRole('tab', { name: GOV_PAGE.tabs.policies, exact: true })
      .click();
    await this.waitForLoad(30_000);
  }

  async openPolicySetsTab(): Promise<void> {
    await this.page.getByRole('tab', { name: GOV_PAGE.tabs.policySets }).click();
    await this.waitForLoad(30_000);
  }

  getPageTitle(): Locator {
    return this.page.getByRole('heading', { name: GOV_PAGE.title, level: 1 });
  }

  getSearchInput(): Locator {
    return this.page.locator(SELECTORS.common.searchInput);
  }

  async searchPolicies(text: string): Promise<void> {
    const input = this.getSearchInput();
    await input.clear();
    await input.fill(text);
    await this.waitForLoad(30_000);
  }

  getPolicyRow(policyName: string): Locator {
    return this.page.getByRole('link', { name: policyName, exact: true });
  }

  getPolicySetCard(policySetName: string): Locator {
    return this.page.getByText(policySetName, { exact: true });
  }
}
