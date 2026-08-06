import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { RoleAssignmentsTable } from '@components/fg-rbac/RoleAssignmentsTable';
import { OcCliService } from '@services/OcCliService';
import { RBAC_ROUTES, RBAC_USER_DETAIL } from '@constants/fg-rbac';
import { PF_SPINNER, PF_SKELETON } from '@constants/selectors';
import { openCreateRoleAssignment } from '@lib/fg-rbac/role-assignment-actions';

/**
 * User detail page with tabs: Details, YAML, Role assignments, Groups.
 *
 * Route: /multicloud/user-management/identities/users/:id
 *
 * Per architecture doc: page objects expose locators, tests assert.
 * Only waitForLoad() and openCreateRoleAssignment() use expect() as wait guards.
 */
export class UserDetailsPage extends BasePage {
  override async waitForLoad(timeout = 30000): Promise<void> {
    const pageSpinner = this.page.locator(
      `${PF_SPINNER}:not(td ${PF_SPINNER}):not([role="gridcell"] ${PF_SPINNER})`,
    );
    await expect(pageSpinner).toHaveCount(0, { timeout });
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0, { timeout });
  }
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

  async gotoUserViaSearch(username: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.identities}`);
    await this.waitForLoad();
    const search = this.page.locator('input[placeholder="Search"]').first();
    await search.fill(username);
    await this.page.getByRole('link', { name: username, exact: true }).click();
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
    await openCreateRoleAssignment(this.page);
  }

  // ---------------------------------------------------------------------------
  // Group detail navigation
  // ---------------------------------------------------------------------------

  async gotoGroupDetail(groupName: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.identities}`);
    await this.waitForLoad();
    await this.page.getByRole('tab', { name: 'Groups' }).click();
    await this.waitForLoad();
    await this.page.getByRole('link', { name: groupName, exact: true }).click();
    await this.waitForLoad();
  }
}
