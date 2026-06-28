/**
 * RHACM4K-61731, 61732, 61733, 61734: RBAC UI - Cluster Scope Role Assignments
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 * Each test uses a dedicated user (matching Polarion ID suffix) from
 * rbacConfig.users, populated dynamically from presets.ts.
 *
 * Roles used: acm-vm-* roles (always available when FG-RBAC is enabled).
 * kubevirt.io:* roles require CNV and may not exist on all clusters.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { RBAC_WIZARD, GRANULARITY_OPTIONS } from '@constants/fg-rbac';

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
      const nextButton = roleAssignmentWizardPage.getNextButton();
      await expect(nextButton).toBeDisabled();
      await roleAssignmentWizardPage.selectClusters([spoke]);
      await expect(nextButton).toBeEnabled();
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select full access granularity', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterRoleAssignment
      );
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toContainText(
        /selected cluster\b/
      );
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
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(spoke);
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

  test('RHACM4K-61732: Create Role Assignment with single cluster - project access', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['clproj-61732'];
    const role = 'acm-vm-extended:view';
    const spoke = rbacConfig.spokeCluster;
    const projectNames = ['default'];

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

    await test.step('3: Select project access granularity and verify create project button', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.projectRoleAssignment
      );
      const createProjectBtn = roleAssignmentWizardPage
        .getModal()
        .locator(`#${RBAC_WIZARD.projects.createButtonId}`);
      await expect(createProjectBtn).toBeEnabled();
      await roleAssignmentWizardPage.selectProjects(projectNames);
      await expect(createProjectBtn).toBeDisabled();
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
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText('Projects');
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
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 120_000 });

      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
      await expect(row.getByText(spoke)).toBeVisible();
    });

    await oc.mcraDeleteAllForUser(user);
  });

  test('RHACM4K-61733: Create Role Assignment with multiple clusters - full access', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['clfull-61733'];
    const role = 'acm-vm-fleet:admin';
    const spoke = rbacConfig.spokeCluster;
    // TODO: Move secondSpoke into rbacConfig when multi-spoke support is formalized
    const envSpokes = (process.env.VIRT_SPOKE_CLUSTER || '').split(',').map((s) => s.trim());
    const secondSpoke = envSpokes[1] || '';

    test.skip(!spoke || !secondSpoke, 'Need two spoke clusters (VIRT_SPOKE_CLUSTER=spoke1,spoke2)');

    const clusters = [spoke, secondSpoke];

    await oc.mcraDeleteAllForUser(user);

    await test.step('1: Navigate and open wizard', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(user);
    });

    await test.step('2: Select cluster scope and both spokes', async () => {
      await roleAssignmentWizardPage.selectScopeClusters();
      await roleAssignmentWizardPage.selectClusters(clusters);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select full access granularity', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterRoleAssignment
      );
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toContainText(
        /selected clusters\b/
      );
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
      for (const cluster of clusters) {
        await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(cluster);
      }
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
      for (const cluster of clusters) {
        await expect(row.getByText(cluster)).toBeVisible();
      }
    });

    await test.step('7: Verify backend MCRA', async () => {
      const userMCRAs = await oc.mcraGetForUser(user);
      expect(userMCRAs.length).toBeGreaterThanOrEqual(1);
      const spec = userMCRAs[0].spec as Record<string, unknown>;
      const roleAssignments = spec.roleAssignments as Record<string, unknown>[];
      expect(roleAssignments[0].clusterRole).toBe(role);
    });

    await oc.mcraDeleteAllForUser(user);
  });

  test('RHACM4K-61734: Create Role Assignment with multiple clusters - project access', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.users['clproj-61734'];
    const role = 'acm-vm-extended:admin';
    const spoke = rbacConfig.spokeCluster;
    // TODO: Move secondSpoke into rbacConfig when multi-spoke support is formalized
    const envSpokes = (process.env.VIRT_SPOKE_CLUSTER || '').split(',').map((s) => s.trim());
    const secondSpoke = envSpokes[1] || '';
    const projectNames = ['default'];

    test.skip(!spoke || !secondSpoke, 'Need two spoke clusters (VIRT_SPOKE_CLUSTER=spoke1,spoke2)');

    const clusters = [spoke, secondSpoke];

    await oc.mcraDeleteAllForUser(user);

    await test.step('1: Navigate and open wizard', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(user);
    });

    await test.step('2: Select cluster scope and both spokes', async () => {
      await roleAssignmentWizardPage.selectScopeClusters();
      await roleAssignmentWizardPage.selectClusters(clusters);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select project access granularity and projects', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.projectRoleAssignment
      );
      const createProjectBtn = roleAssignmentWizardPage
        .getModal()
        .locator(`#${RBAC_WIZARD.projects.createButtonId}`);
      await expect(createProjectBtn).toBeEnabled();
      await roleAssignmentWizardPage.selectProjects(projectNames);
      await expect(createProjectBtn).toBeDisabled();
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
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText('Projects');
      for (const cluster of clusters) {
        await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(cluster);
      }
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
      }).toPass({ intervals: [5_000, 10_000, 15_000], timeout: 120_000 });

      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
      for (const cluster of clusters) {
        await expect(row.getByText(cluster).first()).toBeVisible();
      }
    });

    await oc.mcraDeleteAllForUser(user);
  });
});
