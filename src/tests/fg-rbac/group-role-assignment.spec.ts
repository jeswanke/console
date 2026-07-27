/**
 * RHACM4K-60255: RBAC UI - Group Role Assignment
 *
 * Polarion steps:
 *   1. Log into hub as kubeadmin
 *   2. Navigate to Groups → group → RA tab → create 2 RAs:
 *      - acm-vm-extended:view (Select clusters scope, project=default)
 *      - acm-vm-fleet:view (Global scope)
 *   3. Verify both RAs in table + kebab menu actions
 *   4. Delete both RAs, verify empty state
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { SCOPE_TYPES, GRANULARITY_OPTIONS } from '@constants/fg-rbac';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';
import { OcCliService } from '@services/OcCliService';

const GROUP_NAME = 'clc-e2e-group-60255';
const ROLE_1 = 'acm-vm-extended:view';
const ROLE_2 = 'acm-vm-fleet:view';
const SPOKE = FLEET_VIRT_DEFAULTS.spokeCluster;
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Group Role Assignment', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(300000);

  test.beforeAll(async () => {
    await ocSvc.mcraDeleteAllForGroup(GROUP_NAME);
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForGroup(GROUP_NAME);
  });

  test('RHACM4K-60255: Create and delete group role assignment', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
  }) => {
    await test.step('1: Navigate to group detail page', async () => {
      await userDetailsPage.gotoGroupDetail(GROUP_NAME);
      await expect(userDetailsPage.getPageHeading()).toContainText(GROUP_NAME);
    });

    await test.step('2: Open Role assignments tab', async () => {
      await userDetailsPage.openRoleAssignmentsTab();
      await expect(userDetailsPage.roleAssignmentsTable.getEmptyStateTitle()).toBeVisible({ timeout: 10000 });
    });

    await test.step('3: Create first RA -- acm-vm-extended:view with cluster scope', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters(['local-cluster', SPOKE]);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);
      await roleAssignmentWizardPage.selectProjects(['default']);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.selectRole(ROLE_1);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({ timeout: 30000 });
    });

    await test.step('4: Create second RA -- acm-vm-fleet:view with Global scope', async () => {
      await expect(async () => {
        await userDetailsPage.gotoGroupDetail(GROUP_NAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_1)).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.global);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.selectRole(ROLE_2);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({ timeout: 30000 });
    });

    await test.step('5: Verify both RAs in table', async () => {
      await expect(async () => {
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_1)).toBeVisible();
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE_2)).toBeVisible();
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('6: Delete both RAs via CLI and verify empty state', async () => {
      await ocSvc.mcraDeleteAllForGroup(GROUP_NAME);

      await expect(async () => {
        await userDetailsPage.gotoGroupDetail(GROUP_NAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(userDetailsPage.roleAssignmentsTable.getEmptyStateTitle()).toBeVisible();
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });
    });
  });
});
