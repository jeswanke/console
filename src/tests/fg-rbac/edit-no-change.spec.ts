/**
 * RHACM4K-61825: RBAC UI - Edit No-Change Detection
 *
 * Polarion steps:
 *   1. Create RA for user with kubevirt.io:view + default clusterset full access
 *   2. Open edit wizard, click through without changes
 *   3. Verify danger alert "No changes have been made..." + Save disabled
 *   4. Go back, change role to kubevirt.io:admin
 *   5. Verify diff display + Save enabled
 *   6. Save and verify updated
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { RBAC_WIZARD, SCOPE_TYPES } from '@constants/fg-rbac';
import { OcCliService } from '@services/OcCliService';

const USERNAME = 'clc-e2e-reviewdiff-61825';
const INITIAL_ROLE = 'kubevirt.io:view';
const UPDATED_ROLE = 'kubevirt.io:admin';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Edit No-Change Detection', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(240000);

  test.beforeAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test('RHACM4K-61825: Edit wizard detects no changes and allows role update', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
  }) => {
    await test.step('1: Create initial RA with kubevirt.io:view', async () => {
      await userDetailsPage.gotoRoleAssignments(USERNAME);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets(['default']);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.selectRole(INITIAL_ROLE);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Wait for RA to be editable and open edit wizard', async () => {
      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(USERNAME);
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(INITIAL_ROLE)).toBeVisible({ timeout: 5000 });
        await userDetailsPage.roleAssignmentsTable.openKebabMenu(INITIAL_ROLE);
        const editItem = userDetailsPage.roleAssignmentsTable.getEditItem();
        await expect(editItem).toBeEnabled({ timeout: 3000 });
        await editItem.click();
      }).toPass({ intervals: [15000, 20000], timeout: 180000 });

      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });
    });

    await test.step('3: Click through without changes - verify no-change alert', async () => {
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toBeVisible({ timeout: 10000 });
      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toContainText(
        RBAC_WIZARD.editMode.noChangesAlert
      );
      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeDisabled();
    });

    await test.step('4: Go back and change role to kubevirt.io:admin', async () => {
      const backButton = roleAssignmentWizardPage.getModal().getByRole('button', { name: 'Back' });
      await backButton.click();
      await roleAssignmentWizardPage.selectRole(UPDATED_ROLE);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4b: Verify diff format (strikethrough old value, new value visible)', async () => {
      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toBeHidden({ timeout: 5000 });

      const strikethrough = roleAssignmentWizardPage.getDiffStrikethrough();
      await expect(strikethrough).toBeVisible({ timeout: 5000 });
      await expect(strikethrough).toContainText(INITIAL_ROLE);

      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(UPDATED_ROLE);
    });

    await test.step('5: Verify Save enabled and submit update', async () => {
      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeEnabled({ timeout: 10000 });
      await roleAssignmentWizardPage.submitUpdate();
      await expect(roleAssignmentWizardPage.getUpdatedNotification()).toBeVisible({ timeout: 30000 });
    });

    await test.step('6: Verify updated role in table', async () => {
      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(USERNAME);
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(UPDATED_ROLE)).toBeVisible();
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });
  });
});
