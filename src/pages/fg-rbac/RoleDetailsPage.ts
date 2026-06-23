import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { RBAC_ROUTES, RBAC_RA_TABLE } from '@constants/fg-rbac';

export class RoleDetailsPage extends BasePage {
  private readonly roleAssignmentsTab: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.roleAssignmentsTab = page.getByRole('tab', { name: 'Role assignments' });
  }

  async goto(roleId: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.roleDetails(roleId)}`);
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
