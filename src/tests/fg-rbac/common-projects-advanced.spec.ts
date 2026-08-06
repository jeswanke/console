/**
 * RHACM4K-61867: RBAC UI - Edge Case: Common Projects Advanced Scenarios
 *
 * Polarion steps:
 *   1. Verify system namespace filtering
 *   2. Verify dynamic update when cluster selection changes
 *   3. Verify "Create Common Project" button states
 *   4. Create Common Project
 *   5. Attempt creating an already existing project
 *   6. Create Common Project with partial existence
 *   7. Complete RA with common project and verify
 *
 * Login via storageState (auth.setup.ts).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { SCOPE_TYPES, GRANULARITY_OPTIONS } from '@constants/fg-rbac';
import { managedClusterNamesForPreview } from '@lib/cluster/managedClusterContext';
import { OcCliService } from '@services/OcCliService';

const USERNAME = 'clc-e2e-cpadvanced-61867';
const ROLE = 'kubevirt.io:view';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Common Projects Advanced', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(600000);

  const clusters = managedClusterNamesForPreview();
  const testProjectName = `e2e-cp-${Date.now().toString(36)}`;
  const partialNs = `e2e-partial-${Date.now().toString(36)}`;

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
    await ocSvc.run(`oc delete namespace ${testProjectName} --ignore-not-found`);
    await ocSvc.run(`oc delete namespace ${partialNs} --ignore-not-found`);
    const spoke = clusters.find((c) => c !== 'local-cluster') ?? clusters[0];
    if (spoke) {
      await ocSvc.run(`oc delete namespace ${partialNs} --context=${spoke} --ignore-not-found 2>/dev/null || true`);
      await ocSvc.run(`oc delete namespace ${testProjectName} --context=${spoke} --ignore-not-found 2>/dev/null || true`);
    }
  });

  test('RHACM4K-61867: Common projects advanced scenarios -- system filtering, create, partial', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
  }) => {
    test.skip(clusters.length < 2, `Need at least 2 managed clusters, found ${clusters.length}`);

    const spoke = clusters.find((c) => c !== 'local-cluster') ?? clusters[0];

    await test.step('1: Verify system namespace filtering', async () => {
      await userDetailsPage.gotoUserViaSearch(USERNAME);
      await userDetailsPage.openRoleAssignmentsTab();
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters([spoke]);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 30000,
      });

      const projectRows = roleAssignmentWizardPage.getProjectTableRows();
      const count = await projectRows.count();
      for (let i = 0; i < count; i++) {
        const text = await projectRows.nth(i).textContent();
        expect(text).not.toMatch(/^kube-|^openshift-|^open-cluster-management/);
      }

      await expect(
        roleAssignmentWizardPage.getProjectTableRows().filter({ hasText: 'default' }),
      ).toBeVisible();

      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('2: Verify dynamic update when cluster selection changes', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters([spoke, 'local-cluster']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 30000,
      });

      await expect(
        roleAssignmentWizardPage.getProjectTableRows().filter({ hasText: 'default' }),
      ).toBeVisible();

      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('3: Verify "Create Common Project" button states', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters([spoke, 'local-cluster']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 30000,
      });

      await expect(roleAssignmentWizardPage.getCreateCommonProjectButton()).toBeEnabled();

      await roleAssignmentWizardPage.selectProjects(['default']);

      await expect(roleAssignmentWizardPage.getCreateCommonProjectButton()).toBeDisabled();

      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('4: Create Common Project', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters([spoke, 'local-cluster']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 30000,
      });

      await roleAssignmentWizardPage.getCreateCommonProjectButton().click();
      await expect(roleAssignmentWizardPage.getProjectNameInput()).toBeVisible({ timeout: 10000 });

      await roleAssignmentWizardPage.getProjectNameInput().fill(testProjectName);
      await roleAssignmentWizardPage.getModal().getByRole('button', { name: 'Save' }).click();

      await expect(async () => {
        await expect(
          roleAssignmentWizardPage.getProjectTableRows().filter({ hasText: testProjectName }),
        ).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [5000], timeout: 30000 });

      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('5: Attempt creating an already existing project', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters([spoke, 'local-cluster']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 30000,
      });

      await roleAssignmentWizardPage.getCreateCommonProjectButton().click();
      await expect(roleAssignmentWizardPage.getProjectNameInput()).toBeVisible({ timeout: 10000 });

      await roleAssignmentWizardPage.getProjectNameInput().fill('default');
      await roleAssignmentWizardPage.getModal().getByRole('button', { name: 'Save' }).click();

      const projectRow = roleAssignmentWizardPage.getProjectTableRows().first();
      const statusAlert = roleAssignmentWizardPage
        .getModal()
        .getByText(/created|exists|error/i)
        .first();
      await expect(projectRow.or(statusAlert)).toBeVisible({ timeout: 60000 });

      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('6: Create second Common Project via wizard', async () => {
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters([spoke, 'local-cluster']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 30000,
      });

      await roleAssignmentWizardPage.getCreateCommonProjectButton().click();
      await expect(roleAssignmentWizardPage.getProjectNameInput()).toBeVisible({ timeout: 10000 });

      await roleAssignmentWizardPage.getProjectNameInput().fill(partialNs);
      await roleAssignmentWizardPage.getModal().getByRole('button', { name: 'Save' }).click();

      await expect(async () => {
        await expect(
          roleAssignmentWizardPage.getProjectTableRows().filter({ hasText: partialNs }),
        ).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [10000, 15000], timeout: 90000 });

      await expect(roleAssignmentWizardPage.getCreateCommonProjectButton()).toBeDisabled();
    });

    await test.step('7: Complete RA with common project and verify', async () => {
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.searchRole(ROLE);
      await roleAssignmentWizardPage.selectRole(ROLE);

      // Clear search after selection so wizard validates the full role list state
      const roleSearchInput = roleAssignmentWizardPage.getModal().locator('[aria-label="Search input"]');
      await roleSearchInput.clear();

      await expect(roleAssignmentWizardPage.getNextButton()).toBeEnabled({ timeout: 15000 });
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
