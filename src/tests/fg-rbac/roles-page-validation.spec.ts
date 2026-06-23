/**
 * RHACM4K-61779: RBAC UI - Validate Roles Page
 *
 * Read-only validation of the Roles list page:
 *   1. Verify all 8 expected roles are listed
 *   2. Verify permissions keywords for all 8 roles via table Permissions column
 *   3. Verify role type via CLI (ClusterRole)
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState for admin.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { RBAC_USER_DETAIL, RBAC_ROLES } from '@constants/fg-rbac';

test.describe('Roles Page Validation', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(240000);

  test('RHACM4K-61779: Validate roles list and permissions', async ({
    page,
    rolesListPage,
    roleDetailsPage,
    oc,
  }) => {
    await test.step('1: Navigate to Roles page and verify all 8 roles', async () => {
      await rolesListPage.goto();

      for (const role of RBAC_ROLES.expected) {
        await expect(page.getByRole('link', { name: role, exact: true })).toBeVisible();
      }
    });

    await test.step('2: Verify permissions keywords in table', async () => {
      for (const { name, keywords } of RBAC_ROLES.permissions) {
        const row = page.getByRole('row').filter({
          has: page.getByRole('link', { name, exact: true }),
        });
        const permissionsCell = row.getByRole('gridcell').nth(1);
        for (const keyword of keywords) {
          await expect(permissionsCell).toContainText(keyword);
        }
      }
    });

    await test.step('3: Verify role details metadata and tabs', async () => {
      await roleDetailsPage.goto('kubevirt.io:admin');
      await expect(
        page.getByRole('heading', { name: RBAC_USER_DETAIL.fields.generalInformation, level: 3 })
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Permissions' })).toBeVisible();
      await expect(page.getByRole('tab', { name: RBAC_USER_DETAIL.tabs.roleAssignments })).toBeVisible();
    });

    await test.step('4: Verify YAML tab', async () => {
      const yamlTab = page.getByRole('tab', { name: 'YAML' });
      await expect(yamlTab).toBeVisible();
      await yamlTab.click();
      await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 15000 });
    });

    await test.step('5: Verify role type via CLI', async () => {
      const result = await oc.run('oc get clusterrole acm-vm-fleet:view -o jsonpath="{.kind}"');
      expect(result).toContain('ClusterRole');
    });
  });
});
