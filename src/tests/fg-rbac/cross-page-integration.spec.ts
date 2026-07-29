/**
 * RHACM4K-60254: RBAC UI - Cross-Page Integration
 *
 * Validates the RA wizard can be reached from two entry points:
 *   Step 1: User details → Role assignments tab → Create RA → wizard opens
 *   Step 2: Role details → Role assignments tab → Create RA → wizard opens
 *
 * Read-only test -- no RAs are actually created. Wizard is cancelled after verification.
 * Login is handled by the setup project (auth.setup.ts) via storageState for admin.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { RBAC_USER_DETAIL } from '@constants/fg-rbac';

test.describe('Cross-Page Integration', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(240000);

  test('RHACM4K-60254: Wizard opens from User and Role detail pages', async ({
    userDetailsPage,
    roleDetailsPage,
    roleAssignmentWizardPage,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['hub-view-60310'];
    const roleName = 'kubevirt.io:admin';

    await test.step('1: User details → RA tab → wizard opens', async () => {
      await userDetailsPage.goto(user);
      await expect(userDetailsPage.getPageHeading()).toContainText(user, { timeout: 15000 });

      const generalInfo = userDetailsPage.getGeneralInfoSection();
      await expect(generalInfo).toBeVisible();
      await expect(generalInfo.getByText(RBAC_USER_DETAIL.fields.username)).toBeVisible();
      await expect(generalInfo.getByText(RBAC_USER_DETAIL.fields.identityProvider)).toBeVisible();

      await userDetailsPage.openRoleAssignmentsTab();
      await userDetailsPage.openCreateRoleAssignment();

      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(user);
      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('2: Role details → RA tab → wizard opens', async () => {
      await roleDetailsPage.goto(roleName);
      await expect(roleDetailsPage.getPageHeading()).toContainText(roleName, { timeout: 15000 });

      const roleGeneralInfo = roleDetailsPage.getGeneralInfoSection();
      await expect(roleGeneralInfo).toBeVisible();

      await roleDetailsPage.openRoleAssignmentsTab();
      await roleDetailsPage.openCreateRoleAssignment();

      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(roleName);
      await roleAssignmentWizardPage.clickCancel();
    });
  });
});
