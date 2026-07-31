import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { PF_SKELETON } from '@constants/selectors';
import { OcCliService } from '@services/OcCliService';
import { pageUrlPathnameEquals } from '@lib/navigation';
import {
  CREDENTIAL_ROUTES,
  CREDENTIAL_ROW_ACTIONS,
  CREDENTIAL_BULK_ACTIONS,
} from '@constants/credential-wizard';

export class CredentialsListPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  override async waitForLoad(timeout = 30000): Promise<void> {
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0, { timeout });
  }

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, CREDENTIAL_ROUTES.list)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${CREDENTIAL_ROUTES.list}`);
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async clickAddCredential(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add credential' }).click();
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async searchCredential(name: string): Promise<void> {
    const search = this.page.getByPlaceholder('Search');
    await search.fill(name);
  }

  async clearSearch(): Promise<void> {
    const search = this.page.getByPlaceholder('Search');
    await search.clear();
  }

  // ---------------------------------------------------------------------------
  // Row locators
  // ---------------------------------------------------------------------------

  getCredentialRow(name: string): Locator {
    return this.page.getByRole('row', { name });
  }

  // ---------------------------------------------------------------------------
  // Row kebab actions
  // ---------------------------------------------------------------------------

  async deleteCredentialByKebab(name: string): Promise<void> {
    const row = this.getCredentialRow(name);
    await row.getByRole('button', { name: 'Actions' }).click();
    await this.page.locator(CREDENTIAL_ROW_ACTIONS.delete).click();
    await this.confirmDeleteModal();
  }

  async openEditCredential(name: string): Promise<void> {
    const row = this.getCredentialRow(name);
    await row.getByRole('button', { name: 'Actions' }).click();
    await this.page.locator(CREDENTIAL_ROW_ACTIONS.edit).click();
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  async deleteCredentialsByBulk(names: string[]): Promise<void> {
    for (const name of names) {
      const row = this.getCredentialRow(name);
      await row.getByRole('checkbox').check();
    }
    await this.page.locator(CREDENTIAL_BULK_ACTIONS.actionsDropdown).click();
    await this.page.locator(CREDENTIAL_BULK_ACTIONS.delete).click();
    await this.confirmDeleteModal();
  }

  // ---------------------------------------------------------------------------
  // Delete confirmation modal
  // ---------------------------------------------------------------------------

  private async confirmDeleteModal(): Promise<void> {
    const deleteButton = this.page.getByRole('button', { name: 'Delete', exact: true });
    await expect(deleteButton).toBeVisible({ timeout: 5_000 });
    await deleteButton.click();
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertCredentialExists(name: string, timeout = 10_000): Promise<void> {
    await expect(this.getCredentialRow(name)).toBeVisible({ timeout });
  }

  async assertCredentialNotExists(name: string, timeout = 10_000): Promise<void> {
    await expect(this.getCredentialRow(name)).not.toBeVisible({ timeout });
  }
}
