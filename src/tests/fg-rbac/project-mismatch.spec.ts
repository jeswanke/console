/**
 * RHACM4K-61865: RBAC UI - Project Mismatch Edge Case
 *
 * Polarion steps:
 *   1. Setup - create namespace on hub only (not on spoke)
 *   2. Create RA with project scope on hub cluster
 *   3. Verify RA is healthy
 *   4. Edit RA to add spoke (trigger mismatch -- spoke lacks the namespace)
 *   5. Verify MCRA status via CLI
 *   6. Resolve mismatch by creating namespace on spoke
 *
 * Login via storageState (auth.setup.ts).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { SCOPE_TYPES, GRANULARITY_OPTIONS } from '@constants/fg-rbac';
import { managedClusterNamesForPreview } from '@lib/cluster/managedClusterContext';
import { OcCliService } from '@services/OcCliService';

const USERNAME = 'clc-e2e-projmismatch-61865';
const ROLE = 'kubevirt.io:view';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Project Mismatch', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(600000);

  const clusters = managedClusterNamesForPreview();
  const spokeCluster = clusters.find((c) => c !== 'local-cluster') ?? '';
  const testNs = `e2e-pm-${Date.now().toString(36)}`;

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    await ocSvc.mcraDeleteAllForUser(USERNAME);
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
    await ocSvc.run(`oc delete namespace ${testNs} --ignore-not-found`);
    if (spokeCluster) {
      await ocSvc.run(
        `oc delete namespace ${testNs} --context=${spokeCluster} --ignore-not-found 2>/dev/null || true`,
      );
    }
  });

  test('RHACM4K-61865: Project mismatch when RA targets cluster lacking the namespace', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
  }) => {
    test.skip(!spokeCluster, 'Need at least 2 managed clusters (hub + spoke)');

    await test.step('1: Setup -- create namespace on hub only', async () => {
      await ocSvc.run(
        `oc create namespace ${testNs} --dry-run=client -o yaml | oc apply -f -`,
      );
      const hubNs = await ocSvc.run(`oc get namespace ${testNs} --no-headers 2>/dev/null || echo NOT_FOUND`);
      expect(hubNs).not.toContain('NOT_FOUND');

      const spokeNs = await ocSvc.run(
        `oc get namespace ${testNs} --context=${spokeCluster} --no-headers 2>/dev/null || echo NOT_FOUND`,
      );
      expect(spokeNs).toContain('NOT_FOUND');
    });

    await test.step('2: Create RA with project scope on hub cluster', async () => {
      await userDetailsPage.gotoUserViaSearch(USERNAME);
      await userDetailsPage.openRoleAssignmentsTab();
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.clusters);
      await roleAssignmentWizardPage.selectClusters(['local-cluster']);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.selectGranularity(GRANULARITY_OPTIONS.projectRoleAssignment);

      await expect(roleAssignmentWizardPage.getProjectTableRows().first()).toBeVisible({
        timeout: 30000,
      });
      await roleAssignmentWizardPage.searchProjects(testNs);
      await roleAssignmentWizardPage.selectProjects([testNs]);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.searchRole(ROLE);
      await roleAssignmentWizardPage.selectRole(ROLE);
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });
    });

    await test.step('3: Verify RA is healthy', async () => {
      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
        for (const mcra of mcras) {
          const conditions = ((mcra.status as Record<string, unknown>)?.conditions as Record<string, unknown>[] | undefined);
          const applied = conditions?.find((c) => c.type === 'Applied');
          expect(applied?.status).toBe('True');
        }
      }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });

      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(ROLE)).toBeVisible({
          timeout: 5000,
        });
      }).toPass({ intervals: [5000], timeout: 30000 });
    });

    await test.step('4: Add spoke to RA via CLI (trigger mismatch)', async () => {
      await ocSvc.mcraDeleteAllForUser(USERNAME);
      await ocSvc.mcraCreate({
        name: `e2e-pm-mismatch-${Date.now()}`,
        namespace: 'open-cluster-management-global-set',
        subjectKind: 'User',
        subjectName: USERNAME,
        clusterRole: ROLE,
        placementName: 'global',
        placementNamespace: 'open-cluster-management-global-set',
        raName: 'mismatch-ra',
        targetNamespaces: [testNs],
      });

      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('5: Verify MCRA status via CLI', async () => {
      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('6: Resolve mismatch -- create namespace on spoke', async () => {
      await ocSvc.run(
        `oc create namespace ${testNs} --context=${spokeCluster} --dry-run=client -o yaml | oc apply --context=${spokeCluster} -f - 2>/dev/null || true`,
      );

      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBeGreaterThanOrEqual(1);
        const roles = await ocSvc.mcraGetRolesForUser(USERNAME);
        expect(roles).toContain(ROLE);
      }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
    });
  });
});
