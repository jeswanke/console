/**
 * RHACM4K-61797: RBAC UI - Pre-Authorized User Creation
 *
 * Polarion steps:
 *   1. Navigate to Roles page
 *   2. Navigate to Role Details and Role Assignments tab
 *   3. Open Role Assignment Wizard (role context -- role pre-selected)
 *   4. Verify "add pre-authorized user" link
 *   5. Open Pre-Authorized User form
 *   6. Create Pre-Authorized User
 *   7. Complete RA for pre-authorized user (ClusterSet scope)
 *   8. Verify RA in Role Details page
 *   9. Verify pre-auth user in Identities page
 *  10. Verify MCRA and user created via CLI
 *
 * Login via storageState (auth.setup.ts).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { SCOPE_TYPES } from '@constants/fg-rbac';
import { cleanupMcraAndUser, verifyUserExists } from '@lib/fg-rbac/vm-test-setup';

const PRE_AUTH_USERNAME = `e2e-preauth-${Date.now()}`;
const ROLE = 'acm-vm-cluster-migration:view';

test.describe('FG-RBAC - Pre-Authorized User', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(600000);

  test.afterAll(async () => {
    await cleanupMcraAndUser(PRE_AUTH_USERNAME);
  });

  test('RHACM4K-61797: Create pre-authorized user and assign role from Roles page', async ({
    rolesListPage,
    roleDetailsPage,
    roleAssignmentWizardPage,
    userDetailsPage,
    oc,
  }) => {
    await test.step('1: Navigate to Roles page', async () => {
      await rolesListPage.goto();
      await expect(rolesListPage.getRoleLink(ROLE)).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Navigate to Role Details and Role Assignments tab', async () => {
      await rolesListPage.getRoleLink(ROLE).click();
      await expect(roleDetailsPage.getPageHeading()).toContainText(ROLE, { timeout: 15000 });
      await roleDetailsPage.openRoleAssignmentsTab();
    });

    await test.step('3: Open Role Assignment Wizard', async () => {
      await roleDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(ROLE);
    });

    await test.step('4: Verify "add pre-authorized user" link', async () => {
      await expect(roleAssignmentWizardPage.getPreAuthButton()).toBeVisible({ timeout: 10000 });
    });

    await test.step('5: Open Pre-Authorized User form', async () => {
      await roleAssignmentWizardPage.getPreAuthButton().click();
      await expect(roleAssignmentWizardPage.getPreAuthIdentifierInput()).toBeVisible({
        timeout: 10000,
      });
      await expect(roleAssignmentWizardPage.getSavePreAuthButton()).toBeVisible();
      await expect(roleAssignmentWizardPage.getCancelPreAuthLink()).toBeVisible();
    });

    await test.step('6: Create Pre-Authorized User', async () => {
      await roleAssignmentWizardPage.getPreAuthIdentifierInput().fill(PRE_AUTH_USERNAME);
      await roleAssignmentWizardPage.getSavePreAuthButton().click();
      await expect(roleAssignmentWizardPage.getPreAuthCreatedNotification()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step('7: Complete Role Assignment for pre-authorized user', async () => {
      await roleAssignmentWizardPage.selectIdentity(PRE_AUTH_USERNAME);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets(['default']);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getReviewSubject()).toContainText(PRE_AUTH_USERNAME);
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(ROLE);

      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
    });

    await test.step('8: Verify RA in Role Details page', async () => {
      await expect(async () => {
        await roleDetailsPage.goto(ROLE);
        await roleDetailsPage.openRoleAssignmentsTab();
        const content = roleDetailsPage.getRoleAssignmentsContent();
        await expect(content).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });
    });

    await test.step('9: Verify pre-auth user in Identities page', async () => {
      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(PRE_AUTH_USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE),
        ).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });
    });

    await test.step('10: Verify MCRA and user created via CLI', async () => {
      await expect(async () => {
        const mcras = await oc.mcraGetForUser(PRE_AUTH_USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
        const roles = await oc.mcraGetRolesForUser(PRE_AUTH_USERNAME);
        expect(roles).toContain(ROLE);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      const userExists = await verifyUserExists(PRE_AUTH_USERNAME);
      expect(userExists).toBe(true);
    });
  });
});
