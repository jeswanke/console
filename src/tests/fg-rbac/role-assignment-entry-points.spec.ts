/**
 * RHACM4K-61863, 61856, 61862: RBAC UI - Role Assignment Entry Points
 *
 * Validates that the wizard opens correctly from different entry points
 * (Cluster Set details, Role details, Cluster details) with appropriate
 * pre-selections and hidden steps.
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 * Each test uses a dedicated user (matching Polarion ID suffix) from
 * rbacConfig.users, populated dynamically from presets.ts.
 *
 * Roles used: acm-vm-* roles (always available when FG-RBAC is enabled).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import {
  RBAC_WIZARD,
  SCOPE_TYPES,
  GRANULARITY_OPTIONS,
} from '@constants/fg-rbac';

test.describe('Role Assignment - Entry Points', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(240000);

  test('RHACM4K-61863: Create role assignment from Cluster Set details page', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    clusterSetDetailsPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['clusterset-61863'];
    const role = 'acm-vm-fleet:view';
    const clusterSet = 'default';

    await oc.mcraDeleteAllForUser(user);

    await test.step('1: Navigate to cluster set details RA tab and open wizard', async () => {
      await clusterSetDetailsPage.gotoRoleAssignments(clusterSet);
      await clusterSetDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(clusterSet);
    });

    await test.step('2: Select identity', async () => {
      await roleAssignmentWizardPage.selectIdentity(user);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select full access granularity', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterSetRoleAssignment
      );
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toContainText(
        RBAC_WIZARD.scopeInfo.clusterSets
      );
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Select role', async () => {
      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('5: Review and create', async () => {
      await expect(roleAssignmentWizardPage.getReviewSubject()).toContainText(user);
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(clusterSet);
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(role);
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();
    });

    await test.step('6: Verify role assignment in user details', async () => {
      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(role)
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 90_000 });

      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
      await expect(row.getByText(clusterSet)).toBeVisible();
    });

    await oc.mcraDeleteAllForUser(user);
  });

  test('RHACM4K-61856: Create role assignment from Roles page', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    rolesListPage,
    roleDetailsPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['rolespage-61856'];
    const role = 'acm-vm-fleet:view';

    await oc.mcraDeleteAllForUser(user);

    await test.step('1: Navigate to role details and open wizard', async () => {
      await rolesListPage.goto();
      await roleDetailsPage.goto(role);
      await roleDetailsPage.openRoleAssignmentsTab();
      await roleDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(role);
    });

    await test.step('2: Select identity', async () => {
      await roleAssignmentWizardPage.selectIdentity(user);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select scope - global access', async () => {
      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.global);
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toContainText(
        RBAC_WIZARD.scopeInfo.global
      );
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Review and create (role pre-selected)', async () => {
      await expect(roleAssignmentWizardPage.getReviewSubject()).toContainText(user);
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(role);
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();
    });

    await test.step('5: Verify role assignment in user details', async () => {
      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(role)
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 90_000 });
    });

    await oc.mcraDeleteAllForUser(user);
  });

  test('RHACM4K-61862: Create role assignment from Cluster details page', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    clusterDetailsPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['clpage-61862'];
    const role = 'acm-vm-fleet:view';
    const spoke = rbacConfig.spokeCluster;

    test.skip(!spoke, 'RBAC_SPOKE_CLUSTER not set -- need a spoke cluster for this test');

    await oc.mcraDeleteAllForUser(user);

    await test.step('1: Navigate to cluster details RA tab and open wizard', async () => {
      await clusterDetailsPage.gotoRoleAssignments(spoke, spoke);
      await clusterDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(spoke);
    });

    await test.step('2: Select identity', async () => {
      await roleAssignmentWizardPage.selectIdentity(user);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select full access granularity', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterRoleAssignment
      );
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toContainText(
        /selected cluster\b/
      );
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Select role', async () => {
      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('5: Review and create', async () => {
      await expect(roleAssignmentWizardPage.getReviewSubject()).toContainText(user);
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(spoke);
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(role);
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();
    });

    await test.step('6: Verify role assignment in user details', async () => {
      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(role)
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 90_000 });

      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
      await expect(row.getByText(spoke)).toBeVisible();
    });

    await oc.mcraDeleteAllForUser(user);
  });
});
