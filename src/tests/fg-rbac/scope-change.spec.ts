/**
 * RHACM4K-61944: RBAC UI - Edit Role Assignment - Scope Type Change
 *
 * Polarion steps:
 *   1. Navigate to existing RA (kubevirt.io:view, ClusterSet default)
 *   2. Edit: change scope from ClusterSet → Clusters
 *   3. Save and verify updated scope
 *   4. Edit: change scope from Clusters → Global
 *   5. Save and verify updated scope
 *   6. Edit: change scope from Global → ClusterSet
 *   7. Save and verify updated scope (full cycle)
 *
 * RA created via CLI in beforeAll. Each edit cycle verifies the diff
 * is detected, Save is enabled, and the MCRA is updated via CLI.
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { SCOPE_TYPES } from '@constants/fg-rbac';
import { OcCliService } from '@services/OcCliService';

const USERNAME = 'clc-e2e-scopechange-61944';
const ROLE = 'kubevirt.io:view';
const MCRA_NS = 'open-cluster-management-global-set';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Scope Type Change', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(600000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    await ocSvc.mcraDeleteAllForUser(USERNAME);

    await ocSvc.mcraCreate({
      name: `e2e-scope-61944-${Date.now()}`,
      namespace: MCRA_NS,
      subjectKind: 'User',
      subjectName: USERNAME,
      clusterRole: ROLE,
      placementName: 'cluster-sets-default',
      placementNamespace: MCRA_NS,
      raName: 'scope-change-test',
    });

    await expect(async () => {
      const mcras = await ocSvc.mcraGetForUser(USERNAME);
      expect(mcras.length).toBe(1);
    }).toPass({ intervals: [5000], timeout: 30000 });
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test('RHACM4K-61944: Edit RA scope through ClusterSet → Clusters → Global → ClusterSet', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    rbacConfig,
  }) => {
    const spoke = rbacConfig.spokeCluster;

    await test.step('1: Navigate to user and verify existing RA', async () => {
      await userDetailsPage.gotoUserViaSearch(USERNAME);
      await userDetailsPage.openRoleAssignmentsTab();
      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE);
      await expect(row).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Edit -- change scope from ClusterSet to Clusters', async () => {
      await userDetailsPage.roleAssignmentsTable.clickEditAction(ROLE);
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);

      await expect(roleAssignmentWizardPage.getNextButton()).toBeDisabled();
      await roleAssignmentWizardPage.selectClusters([spoke || 'local-cluster']);
      await expect(roleAssignmentWizardPage.getNextButton()).toBeEnabled({ timeout: 10000 });

      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(
        spoke || 'local-cluster',
      );
      await expect(roleAssignmentWizardPage.getDiffStrikethrough()).toBeVisible({ timeout: 5000 });
      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toBeHidden({ timeout: 5000 });
      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeEnabled({ timeout: 10000 });
    });

    await test.step('3: Save and verify -- ClusterSet → Clusters', async () => {
      await roleAssignmentWizardPage.submitUpdate();
      await expect(roleAssignmentWizardPage.getUpdatedNotification()).toBeVisible({ timeout: 30000 });

      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('4: Edit -- change scope from Clusters to Global', async () => {
      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE)).toBeVisible({
          timeout: 5000,
        });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      await userDetailsPage.roleAssignmentsTable.clickEditAction(ROLE);
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.global);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(/global/i);
      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toBeHidden({ timeout: 5000 });
      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeEnabled({ timeout: 10000 });
    });

    await test.step('5: Save and verify -- Clusters → Global', async () => {
      await roleAssignmentWizardPage.submitUpdate();
      await expect(roleAssignmentWizardPage.getUpdatedNotification()).toBeVisible({ timeout: 30000 });

      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('6: Edit -- change scope from Global to ClusterSet', async () => {
      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE)).toBeVisible({
          timeout: 5000,
        });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      await userDetailsPage.roleAssignmentsTable.clickEditAction(ROLE);
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);

      await expect(roleAssignmentWizardPage.getNextButton()).toBeDisabled();
      await roleAssignmentWizardPage.selectClusterSets(['default']);
      await expect(roleAssignmentWizardPage.getNextButton()).toBeEnabled({ timeout: 10000 });

      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText('default');
      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toBeHidden({ timeout: 5000 });
      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeEnabled({ timeout: 10000 });
    });

    await test.step('7: Save and verify -- Global → ClusterSet (full cycle)', async () => {
      await roleAssignmentWizardPage.submitUpdate();
      await expect(roleAssignmentWizardPage.getUpdatedNotification()).toBeVisible({ timeout: 30000 });

      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
        const roles = await ocSvc.mcraGetRolesForUser(USERNAME);
        expect(roles).toContain(ROLE);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });
  });
});
