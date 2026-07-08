import { Page, Locator, expect } from '@playwright/test';
import { RBAC_RA_TABLE } from '@constants/fg-rbac';

/**
 * Reusable Role Assignments table component.
 *
 * Per architecture doc: components expose locators, tests assert.
 * Standalone (not extending AcmTable) because OUIA IDs are composite/unusable.
 */
export class RoleAssignmentsTable {
  constructor(private readonly page: Page) {}

  getRowByRole(roleName: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('link', { name: roleName, exact: true }) });
  }

  getEmptyStateTitle(): Locator {
    return this.page.getByText(RBAC_RA_TABLE.emptyState.title);
  }

  // ---------------------------------------------------------------------------
  // Kebab actions
  // ---------------------------------------------------------------------------

  async openKebabMenu(roleName: string): Promise<void> {
    const row = this.getRowByRole(roleName);
    await row.locator(RBAC_RA_TABLE.rowActions.kebabSelector).click();
  }

  getEditItem(): Locator {
    return this.page.locator(`#${RBAC_RA_TABLE.rowActions.editId}`);
  }

  getDeleteItem(): Locator {
    return this.page.locator(`#${RBAC_RA_TABLE.rowActions.deleteId}`);
  }

  async clickDeleteAction(): Promise<void> {
    const deleteItem = this.getDeleteItem();
    await expect(deleteItem).toBeEnabled({ timeout: 5000 });
    await deleteItem.click();
  }

  async confirmDelete(): Promise<void> {
    const confirmInput = this.page.locator(`#${RBAC_RA_TABLE.rowActions.confirmInput}`);
    await confirmInput.fill('confirm');
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
  }
}
