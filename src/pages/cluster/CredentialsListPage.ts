import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { pageUrlPathnameEquals } from '@lib/navigation';

export class CredentialsListPage extends BasePage {
  private static readonly credentialsPath = '/multicloud/credentials';

  constructor(
    page: Page,
    private readonly oc: OcCliService,
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, CredentialsListPage.credentialsPath)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${CredentialsListPage.credentialsPath}`);
    await this.waitForLoad();
  }

  getCredentialRow(name: string): Locator {
    return this.page.getByRole('row', { name });
  }

  async assertCredentialExists(name: string, timeout = 10_000): Promise<void> {
    await expect(this.getCredentialRow(name)).toBeVisible({ timeout });
  }

  async assertCredentialNotExists(name: string, timeout = 10_000): Promise<void> {
    await expect(this.getCredentialRow(name)).not.toBeVisible({ timeout });
  }
}
