/**
 * RHACM4K-61731: RBAC UI - Single Cluster Scope Role Assignment (full access)
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 * Each test uses a dedicated user (matching Polarion ID suffix) from
 * rbacConfig.users, populated dynamically from presets.ts.
 *
 * Roles used: acm-vm-* roles (always available when FG-RBAC is enabled).
 * kubevirt.io:* roles require CNV and may not exist on all clusters.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { GRANULARITY_OPTIONS } from '@constants/fg-rbac';

test.describe('Role Assignment - Cluster Scope', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(240000);

  test('RHACM4K-61731: Create Role Assignment with single cluster - full access', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['clfull-61731'];
    const role = 'acm-vm-fleet:view';
    const spoke = rbacConfig.spokeCluster;

    test.skip(!spoke, 'RBAC_SPOKE_CLUSTER not set -- need a spoke cluster for this test');

    await oc.mcraDeleteAllForUser(user);

    await test.step('1: Navigate and open wizard', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(user);
    });

    await test.step('2: Select cluster scope and spoke cluster', async () => {
      await roleAssignmentWizardPage.selectScopeClusters();
      await roleAssignmentWizardPage.selectClusters([spoke]);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select full access granularity', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterRoleAssignment
      );
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toBeVisible();
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Select role', async () => {
      const nextButton = roleAssignmentWizardPage.getNextButton();
      await expect(nextButton).toBeDisabled();
      await roleAssignmentWizardPage.selectRole(role);
      await expect(nextButton).toBeEnabled();
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('5: Review and create', async () => {
      await expect(roleAssignmentWizardPage.getReviewSubject()).toContainText(user);
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(role);
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();
    });

    await test.step('6: Verify role assignment in UI table', async () => {
      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(role)
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 90_000 });

      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
      await expect(row.getByText(spoke)).toBeVisible();
    });

    await oc.mcraDeleteAllForUser(user);
  });
});
