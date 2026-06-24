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
import { RBAC_USER_DETAIL, RBAC_WIZARD } from '@constants/fg-rbac';

test.describe('Cross-Page Integration', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(240000);

  test('RHACM4K-60254: Wizard opens from User and Role detail pages', async ({
    page,
    userDetailsPage,
    roleDetailsPage,
    roleAssignmentWizardPage,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['hub-view-60310'];
    const roleName = 'kubevirt.io:admin';

    await test.step('1: User details → RA tab → wizard opens', async () => {
      await userDetailsPage.goto(user);
      await expect(page.getByRole('heading', { name: user })).toBeVisible({ timeout: 15000 });

      await expect(page.getByText(RBAC_USER_DETAIL.fields.generalInformation)).toBeVisible();
      await expect(page.getByText(RBAC_USER_DETAIL.fields.fullName)).toBeVisible();
      const generalInfo = page.getByRole('heading', {
        name: RBAC_USER_DETAIL.fields.generalInformation, level: 3,
      }).locator('..');
      await expect(generalInfo.getByText(RBAC_USER_DETAIL.fields.username)).toBeVisible();
      await expect(generalInfo.getByText(RBAC_USER_DETAIL.fields.identityProvider)).toBeVisible();

      await page.getByRole('tab', { name: RBAC_USER_DETAIL.tabs.roleAssignments }).click();
      await expect(
        page.getByRole('button', { name: RBAC_WIZARD.title })
      ).toBeVisible({ timeout: 60000 });
      await page.getByRole('button', { name: RBAC_WIZARD.title }).click();

      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(user);
      await roleAssignmentWizardPage.clickCancel();
    });

    await test.step('2: Role details → RA tab → wizard opens', async () => {
      await roleDetailsPage.goto(roleName);
      await expect(page.getByRole('heading', { name: roleName, level: 1 })).toBeVisible({ timeout: 15000 });

      const roleGeneralInfo = page.getByRole('heading', {
        name: RBAC_USER_DETAIL.fields.generalInformation, level: 3,
      }).locator('..');
      await expect(roleGeneralInfo).toBeVisible();

      await page.getByRole('tab', { name: RBAC_USER_DETAIL.tabs.roleAssignments }).click();
      await expect(
        page.getByRole('button', { name: RBAC_WIZARD.title })
      ).toBeVisible({ timeout: 60000 });
      await page.getByRole('button', { name: RBAC_WIZARD.title }).click();

      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(roleName);
      await roleAssignmentWizardPage.clickCancel();
    });
  });
});
