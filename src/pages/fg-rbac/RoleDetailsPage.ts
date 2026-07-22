import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { RBAC_ROUTES, RBAC_USER_DETAIL, RBAC_RA_TABLE, RBAC_WIZARD } from '@constants/fg-rbac';
import { openCreateRoleAssignment } from '@lib/fg-rbac/role-assignment-actions';

export class RoleDetailsPage extends BasePage {
  private readonly roleAssignmentsTab: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.roleAssignmentsTab = page.getByRole('tab', { name: RBAC_USER_DETAIL.tabs.roleAssignments });
  }

  async goto(roleId: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.roleDetails(roleId)}`);
    await this.waitForLoad();
  }

  getPageHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  getGeneralInfoSection(): Locator {
    return this.page.getByRole('heading', {
      name: RBAC_USER_DETAIL.fields.generalInformation, level: 3,
    }).locator('..');
  }

  getTab(name: string): Locator {
    return this.page.getByRole('tab', { name });
  }

  async openRoleAssignmentsTab(): Promise<void> {
    await this.roleAssignmentsTab.click();
    await this.waitForLoad();
  }

  async openCreateRoleAssignment(): Promise<void> {
    await openCreateRoleAssignment(this.page);
  }

  getRoleAssignmentsContent(): Locator {
    return this.page.getByRole('button', { name: RBAC_WIZARD.title }).or(
      this.page.getByText(RBAC_RA_TABLE.emptyState.title)
    );
  }

  async openYamlTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'YAML' }).click();
  }

  getYamlEditor(): Locator {
    return this.page.locator('.monaco-editor').first();
  }
}
