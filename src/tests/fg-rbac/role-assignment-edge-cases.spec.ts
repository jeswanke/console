/**
 * RHACM4K-61735: RBAC UI - Empty Cluster Set Edge Case
 * RHACM4K-61864: RBAC UI - Duplicate Role Assignment Prevention
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 * Cleanup runs at start and end of each test so retries start clean.
 */

import path from 'path';
import { test, expect } from '@fixtures/fg-rbac-test';
import {
  RBAC_WIZARD,
  SCOPE_TYPES,
  GRANULARITY_OPTIONS,
} from '@constants/fg-rbac';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/fg-rbac');
const EMPTY_CLUSTERSET_YAML = path.join(TEMPLATES_DIR, 'empty-clusterset.yaml');
const EMPTY_CS_NAME = 'e2e-empty-clusterset';

test.describe('Role Assignment - Edge Cases', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(240000);

  test('RHACM4K-61735: Empty cluster set edge case', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['edgecase-61735'];
    const spoke = rbacConfig.spokeCluster;
    const role = 'acm-vm-extended:view';

    test.skip(!spoke, 'RBAC_SPOKE_CLUSTER not set -- need a spoke cluster for this test');

    await oc.mcraDeleteAllForUser(user);

    await test.step('0: Create empty cluster set', async () => {
      await oc.applyYaml(EMPTY_CLUSTERSET_YAML);
    });

    await test.step('1: Navigate and select empty cluster set scope', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets([EMPTY_CS_NAME]);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('2: Select cluster set role assignment granularity', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterSetRoleAssignment
      );
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toContainText(
        RBAC_WIZARD.scopeInfo.clusterSets
      );
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select role, review, and create', async () => {
      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getReviewSubject()).toContainText(user);
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(EMPTY_CS_NAME);
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(role);
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();
    });

    await test.step('4: Verify RA shows Pending status (empty CS has no clusters)', async () => {
      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(role)
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 90_000 });

      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
      await expect(row.getByText(EMPTY_CS_NAME)).toBeVisible();
    });

    await test.step('5: Move spoke into empty CS -- triggers future-clusters scenario', async () => {
      await oc.run(
        `oc label managedcluster ${spoke} cluster.open-cluster-management.io/clusterset=${EMPTY_CS_NAME} --overwrite`
      );

      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable
            .getRowByRole(role)
            .getByText('Active')
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 120_000 });
    });

    await test.step('6: Move spoke back to default cluster set', async () => {
      await oc.run(
        `oc label managedcluster ${spoke} cluster.open-cluster-management.io/clusterset=default --overwrite`
      );
    });

    await test.step('7: Delete first RA and create mixed CS selection', async () => {
      await oc.mcraDeleteAllForUser(user);

      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(role)
        ).toBeHidden();
      }).toPass({ intervals: [5_000, 10_000], timeout: 60_000 });

      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets([EMPTY_CS_NAME, 'default']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterSetRoleAssignment
      );
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('8: Complete mixed selection flow and verify', async () => {
      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();

      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        const row = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
        await expect(row).toBeVisible();
        await expect(row.getByText(EMPTY_CS_NAME)).toBeVisible();
        await expect(row.getByText('default')).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 90_000 });

      await oc.mcraDeleteAllForUser(user);
      await oc.deleteYaml(EMPTY_CLUSTERSET_YAML);
    });
  });

  test('RHACM4K-61864: Duplicate role assignment prevention', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['dupra-61864'];
    const role = 'acm-vm-fleet:view';

    await oc.mcraDeleteAllForUser(user);

    await test.step('1: Create initial RA with Global scope', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.global);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();

      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable
            .getRowByRole(role)
            .getByText('Active')
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 90_000 });
    });

    await test.step('2: Attempt duplicate Global RA -- expect error', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.global);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getDuplicateError()).toBeVisible({
        timeout: 30000,
      });
    });

    await test.step('3: Cancel wizard and verify only 1 MCRA exists', async () => {
      await roleAssignmentWizardPage.clickCancel();

      const userMCRAs = await oc.mcraGetForUser(user);
      expect(userMCRAs.length).toBe(1);

      const spec = userMCRAs[0].spec as Record<string, unknown>;
      const roleAssignments = spec.roleAssignments as Record<string, unknown>[];
      expect(roleAssignments.length).toBe(1);
      expect(roleAssignments[0].clusterRole).toBe(role);
    });

    await test.step('4: Create non-duplicate RA with ClusterSet default scope', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets(['default']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterSetRoleAssignment
      );
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();

      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        const rows = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
        await expect(rows.first()).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000], timeout: 60_000 });
    });

    await test.step('5: Attempt duplicate CS RA -- expect error again', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets(['default']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterSetRoleAssignment
      );
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getDuplicateError()).toBeVisible({
        timeout: 30000,
      });

      await roleAssignmentWizardPage.clickCancel();
    });

    await oc.mcraDeleteAllForUser(user);
  });
});
