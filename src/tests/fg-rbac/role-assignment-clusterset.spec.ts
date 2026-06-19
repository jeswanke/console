/**
 * RHACM4K-61727, 61728, 61729: RBAC UI - Cluster Set Scope Role Assignments
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 * Cleanup runs in afterEach so retries start clean.
 *
 * Roles used: acm-vm-* roles (always available when FG-RBAC is enabled).
 * kubevirt.io:* roles require CNV and may not exist on all clusters.
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import {
  RBAC_WIZARD,
  MCRA_RESOURCE,
  SCOPE_TYPES,
  GRANULARITY_OPTIONS,
} from '@constants/fg-rbac';

const CLUSTER_SET = 'default';

test.describe('Role Assignment - Cluster Set Scope', { tag: ['@fg-rbac'] }, () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240000);

  test.beforeEach(async ({ oc, rbacConfig }) => {
    await oc.mcraDeleteAllForUser(rbacConfig.testUser);
  });

  test.afterEach(async ({ oc, rbacConfig }) => {
    await oc.mcraDeleteAllForUser(rbacConfig.testUser);
  });

  test('RHACM4K-61727: Create Role Assignment with single cluster set - full access', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.testUser;
    const role = 'acm-vm-fleet:view';

    await test.step('1: Navigate to Role Assignment creation', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(user);
    });

    await test.step('2: Select cluster set scope', async () => {
      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets([CLUSTER_SET]);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select full access granularity', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterSetRoleAssignment
      );
      await expect(roleAssignmentWizardPage.getScopeInfoMessage()).toContainText(
        RBAC_WIZARD.scopeInfo.clusterSets
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
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(CLUSTER_SET);
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
      await expect(row.getByText(CLUSTER_SET)).toBeVisible();
    });

    await test.step('7: Verify backend MCRA', async () => {
      const userMCRAs = await oc.mcraGetForUser(user);
      expect(userMCRAs.length).toBeGreaterThanOrEqual(1);
      const userMcra = userMCRAs[0];

      const metadata = userMcra.metadata as Record<string, unknown>;
      const labels = metadata.labels as Record<string, string>;
      expect(labels[MCRA_RESOURCE.managedByLabel]).toBe(MCRA_RESOURCE.managedByValue);

      const spec = userMcra.spec as Record<string, unknown>;
      const roleAssignments = spec.roleAssignments as Record<string, unknown>[];
      expect(roleAssignments[0].clusterRole).toBe(role);

      const clusterSelection = roleAssignments[0].clusterSelection as Record<string, unknown>;
      const placements = clusterSelection.placements as Record<string, unknown>[];
      expect(placements[0].name as string).toContain(CLUSTER_SET);

      const status = userMcra.status as Record<string, unknown>;
      const conditions = status.conditions as Record<string, unknown>[];
      const applied = conditions.find((c) => c.type === 'Applied');
      expect(applied?.status).toBe('True');
    });
  });

  test('RHACM4K-61728: Create Role Assignment with single cluster set - project access', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    rbacConfig,
  }) => {
    const user = rbacConfig.testUser;
    const role = 'acm-vm-extended:view';
    const projectNames = ['default'];

    await test.step('1: Navigate and open wizard', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
    });

    await test.step('2: Select cluster set scope', async () => {
      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets([CLUSTER_SET]);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select project access granularity and projects', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.projectRoleAssignment
      );
      await roleAssignmentWizardPage.selectProjects(projectNames);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Select role', async () => {
      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('5: Review and create', async () => {
      await expect(roleAssignmentWizardPage.getReviewScope()).toContainText(CLUSTER_SET);
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
      await expect(row.getByText(CLUSTER_SET)).toBeVisible();
    });
  });

  test('RHACM4K-61729: Create Role Assignment with multiple cluster sets - full access', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    oc,
    rbacConfig,
  }) => {
    const user = rbacConfig.testUser;
    const role = 'acm-vm-fleet:admin';
    const testClusterSet = 'e2e-test-clusterset';

    await test.step('0: Create test cluster set for multi-select', async () => {
      await oc.run(
        `oc apply -f - <<'EOF'
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSet
metadata:
  name: ${testClusterSet}
spec:
  clusterSelector:
    selectorType: ExclusiveClusterSetLabel
EOF`
      );
    });

    const clusterSets = [CLUSTER_SET, testClusterSet];

    await test.step('1: Navigate and open wizard', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();
    });

    await test.step('2: Select multiple cluster sets', async () => {
      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusterSets);
      await roleAssignmentWizardPage.selectClusterSets(clusterSets);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('3: Select full access granularity', async () => {
      await roleAssignmentWizardPage.selectGranularity(
        GRANULARITY_OPTIONS.clusterSetRoleAssignment
      );
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Select role', async () => {
      await roleAssignmentWizardPage.selectRole(role);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('5: Review and create', async () => {
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(role);
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
      await expect(roleAssignmentWizardPage.getModal()).toBeHidden();
    });

    await test.step('6: Verify cluster sets column shows both names', async () => {
      await expect(async () => {
        await userDetailsPage.gotoRoleAssignments(user);
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(role)
        ).toBeVisible();
      }).toPass({ intervals: [5_000, 10_000], timeout: 60_000 });

      const row = userDetailsPage.roleAssignmentsTable.getRowByRole(role);
      for (const cs of clusterSets) {
        await expect(row.getByText(cs)).toBeVisible();
      }
    });

    await test.step('7: Cleanup test cluster set', async () => {
      await oc.run(`oc delete managedclusterset ${testClusterSet} --ignore-not-found`);
    });
  });
});
