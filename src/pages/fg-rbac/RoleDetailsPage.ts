import { Page } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { RBAC_ROUTES } from '@constants/fg-rbac';

export class RoleDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(roleId: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.roleDetails(roleId)}`);
    await this.waitForLoad();
  }
}
