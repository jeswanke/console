/**
 * RHACM4K-61825: RBAC UI - Edit No-Change Detection
 *
 * Polarion steps:
 *   1. Open edit wizard on existing RA, click through without changes
 *   2. Verify danger alert "No changes have been made..." + Save disabled
 *   3. Go back, change role to kubevirt.io:admin
 *   4. Verify diff format (strikethrough + new value)
 *   5. Save and verify updated
 *
 * RA created via CLI in beforeAll for reliability (wizard-created MCRAs
 * have delayed permission propagation that causes kebab items to stay disabled).
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { RBAC_WIZARD } from '@constants/fg-rbac';
import { OcCliService } from '@services/OcCliService';

const USERNAME = 'clc-e2e-reviewdiff-61825';
const INITIAL_ROLE = 'kubevirt.io:view';
const UPDATED_ROLE = 'kubevirt.io:admin';
const MCRA_NAME = `e2e-reviewdiff-${Date.now()}`;
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Edit No-Change Detection', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(300000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    await ocSvc.mcraDeleteAllForUser(USERNAME);

    await ocSvc.mcraCreate({
      name: MCRA_NAME,
      namespace: 'open-cluster-management-global-set',
      subjectKind: 'User',
      subjectName: USERNAME,
      clusterRole: INITIAL_ROLE,
      placementName: 'cluster-sets-default',
      placementNamespace: 'open-cluster-management-global-set',
      raName: 'edit-test-access',
    });

    await expect(async () => {
      const canPatch = await ocSvc.rbacAuthCanI(
        'patch', 'multiclusterroleassignments.rbac.open-cluster-management.io', 'open-cluster-management-global-set', 'system:admin'
      );
      expect(canPatch).toBe(true);
    }).toPass({ intervals: [5000], timeout: 30000 });
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test('RHACM4K-61825: Edit wizard detects no changes and allows role update', async ({
    page,
    userDetailsPage,
    roleAssignmentWizardPage,
  }) => {
    await test.step('1: Navigate to user and open edit wizard', async () => {
      await userDetailsPage.gotoUserViaSearch(USERNAME);
      await userDetailsPage.openRoleAssignmentsTab();
      await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(INITIAL_ROLE)).toBeVisible({ timeout: 30000 });

      await expect(async () => {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await userDetailsPage.roleAssignmentsTable.openKebabMenu(INITIAL_ROLE);
        const editItem = userDetailsPage.roleAssignmentsTable.getEditItem();
        await expect(editItem).toBeEnabled({ timeout: 60000 });
        await editItem.click();
      }).toPass({ intervals: [5000], timeout: 120000 });

      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });
    });

    await test.step('2: Click through without changes - verify no-change alert', async () => {
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toBeVisible({ timeout: 10000 });
      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toContainText(
        RBAC_WIZARD.editMode.noChangesAlert
      );
      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeDisabled();
    });

    await test.step('3: Go back and change role to kubevirt.io:admin', async () => {
      const backButton = roleAssignmentWizardPage.getModal().getByRole('button', { name: 'Back' });
      await backButton.click();
      await roleAssignmentWizardPage.selectRole(UPDATED_ROLE);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Verify diff format (strikethrough old value, new value visible)', async () => {
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
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(UPDATED_ROLE)).toBeVisible();
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });
  });
});
