/**
 * RHACM4K-61866: RBAC UI - Delete Role Assignment
 *
 * Polarion steps:
 *   1. Verify 2 RAs exist (created via CLI in beforeAll)
 *   2. Delete one RA via kebab menu, verify 1 remaining + MCRA still exists
 *   3. Delete last RA via kebab menu, verify empty state + MCRA deleted
 *   4. Verify placements persist after MCRA deletion
 *   5. Recreate 2 RAs, bulk delete via checkbox selection, verify MCRA deleted
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { OcCliService } from '@services/OcCliService';

const USERNAME = 'clc-e2e-delete-61866';
const ROLE_1 = 'kubevirt.io:view';
const ROLE_2 = 'kubevirt.io:admin';
const MCRA_NS = 'open-cluster-management-global-set';
const PLACEMENT_NAME = 'cluster-sets-default';
const ocSvc = new OcCliService();

async function createTwoRAs(): Promise<void> {
  await ocSvc.mcraCreate({
    name: `e2e-del-66-a-${Date.now()}`,
    namespace: MCRA_NS,
    subjectKind: 'User',
    subjectName: USERNAME,
    clusterRole: ROLE_1,
    placementName: PLACEMENT_NAME,
    placementNamespace: MCRA_NS,
    raName: 'delete-test-view',
  });
  await ocSvc.mcraCreate({
    name: `e2e-del-66-b-${Date.now()}`,
    namespace: MCRA_NS,
    subjectKind: 'User',
    subjectName: USERNAME,
    clusterRole: ROLE_2,
    placementName: PLACEMENT_NAME,
    placementNamespace: MCRA_NS,
    raName: 'delete-test-admin',
  });
}

test.describe('FG-RBAC - Delete Role Assignment', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(600000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    await ocSvc.mcraDeleteAllForUser(USERNAME);
    await createTwoRAs();

    await expect(async () => {
      const mcras = await ocSvc.mcraGetForUser(USERNAME);
      expect(mcras.length).toBe(2);
    }).toPass({ intervals: [5000], timeout: 30000 });
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test('RHACM4K-61866: Delete role assignments individually and in bulk', async ({
    page,
    userDetailsPage,
  }) => {
    await test.step('1: Navigate to user and verify 2 RAs exist', async () => {
      await userDetailsPage.gotoUserViaSearch(USERNAME);
      await userDetailsPage.openRoleAssignmentsTab();
      await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_1)).toBeVisible({ timeout: 30000 });
      await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_2)).toBeVisible({ timeout: 10000 });
    });

    await test.step('2: Delete kubevirt.io:admin via kebab menu', async () => {
      await userDetailsPage.roleAssignmentsTable.clickDeleteAction(ROLE_2);
      await userDetailsPage.roleAssignmentsTable.confirmDelete();

      await expect(async () => {
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_2)).toBeHidden();
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_1)).toBeVisible();
      }).toPass({ intervals: [5000], timeout: 30000 });
    });

    await test.step('3: Verify MCRA still exists with 1 entry via CLI', async () => {
      const mcras = await ocSvc.mcraGetForUser(USERNAME);
      expect(mcras.length).toBeGreaterThanOrEqual(1);
    });

    await test.step('4: Delete last RA (kubevirt.io:view) via kebab menu', async () => {
      await userDetailsPage.roleAssignmentsTable.clickDeleteAction(ROLE_1);
      await userDetailsPage.roleAssignmentsTable.confirmDelete();

      await expect(userDetailsPage.roleAssignmentsTable.getEmptyStateTitle()).toBeVisible({ timeout: 30000 });
    });

    await test.step('5: Verify MCRA fully deleted via CLI', async () => {
      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBe(0);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('6: Verify placements persist after MCRA deletion', async () => {
      const output = await ocSvc.run(
        `oc get placement ${PLACEMENT_NAME} -n ${MCRA_NS} --no-headers 2>/dev/null || echo NOT_FOUND`
      );
      expect(output).not.toContain('NOT_FOUND');
    });

    await test.step('7: Recreate 2 RAs for bulk delete test', async () => {
      await createTwoRAs();

      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_1)).toBeVisible({ timeout: 5000 });
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_2)).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [10000], timeout: 60000 });
    });

    await test.step('8: Bulk delete -- select both rows and delete via toolbar', async () => {
      const row1 = userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_1);
      const row2 = userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_2);
      await row1.getByRole('checkbox').check();
      await row2.getByRole('checkbox').check();

      await expect(page.getByText(/2 selected/)).toBeVisible({ timeout: 5000 });

      const toolbarActions = page.getByRole('button', { name: 'Actions', exact: true }).first();
      await toolbarActions.click();
      await page.getByRole('menuitem', { name: 'Delete role assignments' }).click();

      await userDetailsPage.roleAssignmentsTable.confirmDelete();

      await expect(userDetailsPage.roleAssignmentsTable.getEmptyStateTitle()).toBeVisible({ timeout: 60000 });
    });

    await test.step('9: Verify MCRA deleted after bulk delete', async () => {
      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBe(0);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });
  });
});
