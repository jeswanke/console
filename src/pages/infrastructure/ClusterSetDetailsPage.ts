import { Page } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { RBAC_ROUTES } from '@constants/fg-rbac';
import { openCreateRoleAssignment } from '@lib/fg-rbac/role-assignment-actions';

export class ClusterSetDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async gotoRoleAssignments(clusterSetName: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.clusterSetRoleAssignments(clusterSetName)}`);
    await this.waitForLoad();
  }

  async openCreateRoleAssignment(): Promise<void> {
    await openCreateRoleAssignment(this.page);
  }
}
