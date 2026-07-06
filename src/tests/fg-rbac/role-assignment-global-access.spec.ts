/**
 * RHACM4K-61726: RBAC UI - Create Role Assignment (Global Access)
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 * Cleanup runs in afterEach so retries start clean.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { RBAC_WIZARD, MCRA_RESOURCE, SCOPE_TYPES } from '@constants/fg-rbac';

const ROLE = 'kubevirt.io:view';

test.describe('Role Assignment - Global Access', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(180000);

  test('RHACM4K-61726: Create Role Assignment with Global access', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['global-61726'];
    await oc.mcraDeleteAllForUser(user);

    await test.step('1: Navigate to Role Assignment creation', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(user);
    });

    await test.step('2: Verify scope options', async () => {
      await roleAssignmentWizardPage.getScopeTypeDropdown().click();
      await expect(roleAssignmentWizardPage.getScopeOption(SCOPE_TYPES.global)).toBeVisible();
      await expect(roleAssignmentWizardPage.getScopeOption(SCOPE_TYPES.clusterSets)).toBeVisible();
      await expect(roleAssignmentWizardPage.getScopeOption(SCOPE_TYPES.clusters)).toBeVisible();
      await roleAssignmentWizardPage.getScopeOption(SCOPE_TYPES.global).click();
    });

    await test.step('3: Select Global access scope', async () => {
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toContainText(
        RBAC_WIZARD.scopeInfo.global
      );
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Select role', async () => {
      const nextButton = roleAssignmentWizardPage.getNextButton();
      await expect(nextButton).toBeDisabled();
      await roleAssignmentWizardPage.selectRole(ROLE);
      await expect(nextButton).toBeEnabled();
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('5: Review and create', async () => {
      await expect(roleAssignmentWizardPage.getReviewSubject()).toContainText(user);
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(/Global/);
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(ROLE);
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({ timeout: 30000 });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();
    });

    await test.step('6: Verify role assignment in UI table', async () => {
      await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE)).toBeVisible();
      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE);
      await expect(row.getByText('global')).toBeVisible();

      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE).getByText('Active')
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 90_000 });
    });

    await test.step('7: Verify links in RA table', async () => {
      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE);
      const roleLink = row.getByRole('link', { name: ROLE });
      await expect(roleLink).toHaveAttribute('href', /\/roles\//);
      const clusterSetLink = row.getByRole('link', { name: 'global' });
      await expect(clusterSetLink).toHaveAttribute('href', /clusters\/sets/);
      const clusterLinks = row.locator('a[href*="/clusters/details/"]');
      await expect(clusterLinks.first()).toBeVisible();
    });

    await test.step('8: Verify View Examples drawer', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await roleAssignmentWizardPage.openViewExamples();
      await expect(roleAssignmentWizardPage.getExamplesDrawer()).toBeVisible();
      await roleAssignmentWizardPage.closeViewExamples();
      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('9: Verify backend MCRA', async () => {
      const userMCRAs = await oc.mcraGetForUser(user);
      expect(userMCRAs.length).toBeGreaterThanOrEqual(1);
      const userMcra = userMCRAs[0];

      const metadata = userMcra.metadata as Record<string, unknown>;
      const labels = metadata.labels as Record<string, string>;
      expect(labels[MCRA_RESOURCE.managedByLabel]).toBe(MCRA_RESOURCE.managedByValue);

      const spec = userMcra.spec as Record<string, unknown>;
      const roleAssignments = spec.roleAssignments as Record<string, unknown>[];
      expect(roleAssignments[0].clusterRole).toBe(ROLE);

      const clusterSelection = roleAssignments[0].clusterSelection as Record<string, unknown>;
      const placements = clusterSelection.placements as Record<string, unknown>[];
      expect(placements[0].name).toBe('global');

      const status = userMcra.status as Record<string, unknown>;
      const conditions = status.conditions as Record<string, unknown>[];
      const applied = conditions.find((c) => c.type === 'Applied');
      expect(applied?.status).toBe('True');
    });
  });

  test.afterEach(async ({ oc, rbacConfig }) => {
    await oc.mcraDeleteAllForUser(rbacConfig.users['global-61726']);
  });
});
