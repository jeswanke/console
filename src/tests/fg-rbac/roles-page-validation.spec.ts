/**
 * RHACM4K-61779: RBAC UI - Validate Roles Page
 *
 * Read-only validation of the Roles list page:
 *   1. Verify all 8 expected roles are listed
 *   2. Verify permissions keywords for all 8 roles via table Permissions column
 *   3. Verify role details metadata and tabs
 *   4. Verify role assignments tab
 *   5. Verify YAML tab content
 *   6. Verify role type via CLI (ClusterRole)
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState for admin.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { RBAC_ROLES } from '@constants/fg-rbac';

test.describe('Roles Page Validation', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(240000);

  test('RHACM4K-61779: Validate roles list and permissions', async ({
    rolesListPage,
    roleDetailsPage,
    oc,
  }) => {
    await test.step('1: Navigate to Roles page and verify all 8 roles', async () => {
      await rolesListPage.goto();

      for (const role of RBAC_ROLES.expected) {
        await expect(rolesListPage.getRoleLink(role)).toBeVisible();
      }
    });

    await test.step('2: Verify permissions keywords in table', async () => {
      for (const { name, keywords } of RBAC_ROLES.permissions) {
        const permissionsCell = rolesListPage.getPermissionsCell(name);
        for (const keyword of keywords) {
          await expect(permissionsCell).toContainText(keyword);
        }
      }
    });

    await test.step('3: Verify role details metadata and tabs', async () => {
      await roleDetailsPage.goto('kubevirt.io:admin');
      await expect(roleDetailsPage.getGeneralInfoSection()).toBeVisible({ timeout: 15000 });
      await expect(roleDetailsPage.getTab('Details')).toBeVisible();
      await expect(roleDetailsPage.getTab('Permissions')).toBeVisible();
      await expect(roleDetailsPage.getTab('Role assignments')).toBeVisible();
    });

    await test.step('4: Verify role assignments tab', async () => {
      await roleDetailsPage.openRoleAssignmentsTab();
      await expect(roleDetailsPage.getRoleAssignmentsContent()).toBeVisible({ timeout: 30000 });
    });

    await test.step('5: Verify YAML tab content', async () => {
      await roleDetailsPage.openYamlTab();
      await expect(roleDetailsPage.getYamlEditor()).toBeVisible({ timeout: 15000 });
    });

    await test.step('6: Verify role type via CLI', async () => {
      const result = await oc.run('oc get clusterrole acm-vm-fleet:view -o jsonpath="{.kind}"');
      expect(result).toContain('ClusterRole');
    });
  });
});
