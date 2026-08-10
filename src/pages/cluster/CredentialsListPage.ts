import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { PF_SKELETON } from '@constants/selectors';
import { OcCliService } from '@services/OcCliService';
import { pageUrlPathnameEquals } from '@lib/navigation';
import { CREDENTIAL_ROUTES, CREDENTIAL_BULK_ACTIONS } from '@constants/credential-wizard';

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
    await this.searchCredential(name);
    await this.clickEnabledKebabAction(name, /Delete credential/i);
    await this.confirmDeleteModal();
  }

  async openEditCredential(name: string): Promise<void> {
    await this.searchCredential(name);
    await this.clickEnabledKebabAction(name, /Edit credential/i);
    await this.waitForLoad();
  }

  // Retry kebab open → click: ACM runs an async RBAC check after
  // search re-renders the table. Menu items stay aria-disabled until
  // the check completes. Closing and reopening the kebab picks up
  // the resolved RBAC state.
  private async clickEnabledKebabAction(rowName: string, actionName: RegExp): Promise<void> {
    await expect(async () => {
      const row = this.getCredentialRow(rowName);
      await row.getByRole('button', { name: 'Actions' }).click();
      const item = this.page.getByRole('menuitem', { name: actionName });
      await expect(item).not.toHaveAttribute('aria-disabled', 'true', { timeout: 2_000 });
      await item.click();
    }).toPass({ timeout: 30_000 });
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
    const confirmInput = this.page.getByRole('textbox');
    await expect(confirmInput).toBeVisible({ timeout: 5_000 });
    await confirmInput.fill('confirm');
    const deleteButton = this.page.getByRole('button', { name: 'Delete', exact: true });
    await deleteButton.click();
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  async assertCredentialExists(name: string, timeout = 10_000): Promise<void> {
    await this.searchCredential(name);
    await expect(this.getCredentialRow(name)).toBeVisible({ timeout });
  }

  async assertCredentialNotExists(name: string, timeout = 10_000): Promise<void> {
    await this.searchCredential(name);
    await expect(this.getCredentialRow(name)).not.toBeVisible({ timeout });
  }
}
