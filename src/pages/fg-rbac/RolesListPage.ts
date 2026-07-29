import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { RBAC_ROUTES } from '@constants/fg-rbac';

export class RolesListPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.roles}`);
    await this.waitForLoad();
  }

  getRoleLink(name: string): Locator {
    return this.page.getByRole('link', { name, exact: true });
  }

  getPermissionsCell(roleName: string): Locator {
    const row = this.page.getByRole('row').filter({
      has: this.page.getByRole('link', { name: roleName, exact: true }),
    });
    return row.getByRole('gridcell').nth(1);
  }
}
