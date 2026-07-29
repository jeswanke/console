import { Page, expect } from '@playwright/test';
import { RBAC_RA_TABLE } from '@constants/fg-rbac';

/**
 * Click the "Create role assignment" toolbar button after waiting for it to be enabled.
 * Shared across UserDetailsPage, RoleDetailsPage, ClusterDetailsPage, ClusterSetDetailsPage.
 */
export async function openCreateRoleAssignment(page: Page): Promise<void> {
  const createButton = page.getByRole('button', {
    name: RBAC_RA_TABLE.toolbar.createButtonLabel,
  });
  await expect(createButton).not.toHaveAttribute('aria-disabled', 'true', { timeout: 60000 });
  await createButton.click();
}
