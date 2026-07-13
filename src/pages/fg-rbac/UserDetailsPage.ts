import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { RoleAssignmentsTable } from '@components/fg-rbac/RoleAssignmentsTable';
import { OcCliService } from '@services/OcCliService';
import { RBAC_ROUTES, RBAC_USER_DETAIL, RBAC_RA_TABLE } from '@constants/fg-rbac';

/**
 * User detail page with tabs: Details, YAML, Role assignments, Groups.
 *
 * Route: /multicloud/user-management/identities/users/:id
 *
 * Per architecture doc: page objects expose locators, tests assert.
 * Only waitForLoad() and openCreateRoleAssignment() use expect() as wait guards.
 */
export class UserDetailsPage extends BasePage {
  readonly roleAssignmentsTable: RoleAssignmentsTable;

  private readonly roleAssignmentsTab: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.roleAssignmentsTable = new RoleAssignmentsTable(page);

    this.roleAssignmentsTab = page.getByRole('tab', { name: RBAC_USER_DETAIL.tabs.roleAssignments });
  }

  getPageHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  getGeneralInfoSection(): Locator {
    return this.page.getByRole('heading', {
      name: RBAC_USER_DETAIL.fields.generalInformation, level: 3,
    }).locator('..');
  }

  async goto(userId: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.userDetails(userId)}`);
    await this.waitForLoad();
  }

  async gotoRoleAssignments(userId: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.userRoleAssignments(userId)}`);
    await this.waitForLoad();
  }

  async openRoleAssignmentsTab(): Promise<void> {
    await this.roleAssignmentsTab.click();
    await this.waitForLoad();
  }

  async openCreateRoleAssignment(): Promise<void> {
    const createButton = this.page.getByRole('button', {
      name: RBAC_RA_TABLE.toolbar.createButtonLabel,
    });
    await expect(createButton).not.toHaveAttribute('aria-disabled', 'true', { timeout: 60000 });
    await createButton.click();
  }

}
