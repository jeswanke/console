/**
 * FG-RBAC fixture.
 *
 * Extends rbac-test with area-specific page objects:
 *   - User Management pages (UserDetailsPage, RoleAssignmentWizardPage)
 *   - MCRA operations available via oc (inherited from rbac-test)
 */
import { test as rbacBase, expect } from '@fixtures/rbac-test';
import { UserDetailsPage } from '@pages/fg-rbac/UserDetailsPage';
import { RolesListPage } from '@pages/fg-rbac/RolesListPage';
import { RoleDetailsPage } from '@pages/fg-rbac/RoleDetailsPage';
import { RoleAssignmentWizardPage } from '@pages/fg-rbac/RoleAssignmentWizardPage';
import { getRbacConfig } from '@config';
import type { RbacConfig } from '@config';

type FgRbacFixtures = {
  rbacConfig: RbacConfig;
  userDetailsPage: UserDetailsPage;
  rolesListPage: RolesListPage;
  roleDetailsPage: RoleDetailsPage;
  roleAssignmentWizardPage: RoleAssignmentWizardPage;
};

export const test = rbacBase.extend<FgRbacFixtures>({
  rbacConfig: async ({}, use) => {
    await use(getRbacConfig());
  },

  userDetailsPage: async ({ page, oc }, use) => {
    await use(new UserDetailsPage(page, oc));
  },

  rolesListPage: async ({ page, oc }, use) => {
    await use(new RolesListPage(page, oc));
  },

  roleDetailsPage: async ({ page, oc }, use) => {
    await use(new RoleDetailsPage(page, oc));
  },

  roleAssignmentWizardPage: async ({ page }, use) => {
    await use(new RoleAssignmentWizardPage(page));
  },
});

export { expect };
