/**
 * RHACM4K-61736: RBAC UI - Common Projects Edge Case
 *
 * Polarion steps:
 *   1. Navigate to create RA wizard
 *   2. Select single cluster -- observe all projects
 *   3. Select two clusters -- observe common projects filtering (shorter list)
 *   4. Verify common projects accuracy via CLI
 *   5. Test with cluster sets -- common projects across sets
 *   6. Complete RA creation with common project 'default'
 *
 * Projects table appears on the granularity step after selecting
 * "Project role assignment" -- Next is disabled until a project is selected.
 * Each scenario reopens the wizard for clean state.
 * Login via storageState (auth.setup.ts).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { SCOPE_TYPES, GRANULARITY_OPTIONS } from '@constants/fg-rbac';
import { managedClusterNamesForPreview } from '@lib/cluster/managedClusterContext';
import { OcCliService } from '@services/OcCliService';

const USERNAME = 'clc-e2e-edgecase-61736';
const ROLE = 'kubevirt.io:view';
const COMMON_PROJECT = 'default';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Common Projects', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(600000);

  const clusters = managedClusterNamesForPreview();

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test('RHACM4K-61736: Common projects filtering across clusters and cluster sets', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
  }) => {
    test.skip(clusters.length < 2, `Need at least 2 managed clusters, found ${clusters.length}`);

    const spoke = clusters.find((c) => c !== 'local-cluster') ?? clusters[0];
    let singleClusterProjectCount = 0;

    await test.step('1: Navigate to user page', async () => {
      await userDetailsPage.gotoUserViaSearch(USERNAME);
      await userDetailsPage.openRoleAssignmentsTab();
    });

    await test.step('2: Select single cluster -- observe all projects', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters([spoke]);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 90000,
      });
      singleClusterProjectCount = await roleAssignmentWizardPage.getProjectTableRows().count();
      expect(singleClusterProjectCount).toBeGreaterThan(0);

      await expect(
        roleAssignmentWizardPage.getProjectTableRows().filter({ hasText: COMMON_PROJECT }),
      ).toBeVisible();

      await expect(roleAssignmentWizardPage.getNextButton()).toBeDisabled();

      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('3: Select two clusters -- observe common projects filtering', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters([spoke, 'local-cluster']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 30000,
      });
      const twoClusterProjectCount = await roleAssignmentWizardPage.getProjectTableRows().count();

      expect(twoClusterProjectCount).toBeLessThanOrEqual(singleClusterProjectCount);
      await expect(
        roleAssignmentWizardPage.getProjectTableRows().filter({ hasText: COMMON_PROJECT }),
      ).toBeVisible();

      await expect(roleAssignmentWizardPage.getNextButton()).toBeDisabled();
      await roleAssignmentWizardPage.selectProjects([COMMON_PROJECT]);
      await expect(roleAssignmentWizardPage.getNextButton()).toBeEnabled({ timeout: 10000 });

      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('4: Verify common projects accuracy via CLI', async () => {
      const nsOnSpoke = await ocSvc.run(
        `oc get namespaces --no-headers -o custom-columns=NAME:.metadata.name --context=${spoke} 2>/dev/null || oc get namespaces --no-headers -o custom-columns=NAME:.metadata.name`,
      );
      expect(nsOnSpoke).toContain(COMMON_PROJECT);
    });

    await test.step('5: Test with cluster sets -- common projects across sets', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets(['default']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 90000,
      });
      const csProjectCount = await roleAssignmentWizardPage.getProjectTableRows().count();
      expect(csProjectCount).toBeGreaterThan(0);

      await expect(
        roleAssignmentWizardPage.getProjectTableRows().filter({ hasText: COMMON_PROJECT }),
      ).toBeVisible();

      await expect(roleAssignmentWizardPage.getNextButton()).toBeDisabled();
    });

    await test.step('6: Complete RA creation with common project', async () => {
      await roleAssignmentWizardPage.selectProjects([COMMON_PROJECT]);
      await expect(roleAssignmentWizardPage.getNextButton()).toBeEnabled({ timeout: 10000 });
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.searchRole(ROLE);
      await roleAssignmentWizardPage.selectRole(ROLE);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });

      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
        const roles = await ocSvc.mcraGetRolesForUser(USERNAME);
        expect(roles).toContain(ROLE);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });
  });
});
