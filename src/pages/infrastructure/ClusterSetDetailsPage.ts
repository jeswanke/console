import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { RBAC_ROUTES, RBAC_RA_TABLE } from '@constants/fg-rbac';

export class ClusterSetDetailsPage extends BasePage {
  private readonly createButton: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.createButton = page.getByRole('button', {
      name: RBAC_RA_TABLE.toolbar.createButtonLabel,
    });
  }

  async gotoRoleAssignments(clusterSetName: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${RBAC_ROUTES.clusterSetRoleAssignments(clusterSetName)}`);
    await this.waitForLoad();
  }

  async openCreateRoleAssignment(): Promise<void> {
    await expect(this.createButton).not.toHaveAttribute('aria-disabled', 'true', { timeout: 60000 });
    await this.createButton.click();
  }
}
