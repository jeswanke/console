import { Page, Locator } from '@playwright/test';

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
}
