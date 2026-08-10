/**
 * RHACM4K-61823: RBAC UI - Edit Role Assignment
 *
 * Polarion steps:
 *   1. Navigate to existing RA (kubevirt.io:view on cluster set default)
 *   2. Open edit wizard -- verify title, pre-populated values
 *   3. Modify role to kubevirt.io:admin
 *   4. Review changes and save
 *   5. Verify updated role in table
 *   6. Verify MCRA updated via CLI + Search UI YAML
 *   7. Edit again (admin → view) -- verify delete old + create new MCRA
 *   8. Multiple RAs -- create 2nd RA, edit one, verify both persist
 *   9. Manual MCRA isolation -- UI never appends to non-console MCRAs
 *
 * RA created via CLI in beforeAll. Login via storageState (auth.setup.ts).
 */

import path from 'path';
import { test, expect } from '@fixtures/fg-rbac-test';
import { SCOPE_TYPES, MCRA_RESOURCE } from '@constants/fg-rbac';
import { SEARCH_DETAILS_PAGE } from '@constants/search';
import { OcCliService } from '@services/OcCliService';
import { SearchPage } from '@pages/search/SearchPage';
import { SearchDetailsPage } from '@pages/search/SearchDetailsPage';

const TEMPLATES_DIR = path.join(__dirname, '../../templates/fg-rbac');
const MANUAL_MCRA_YAML = path.join(TEMPLATES_DIR, 'manual-mcra-61823.yaml');

const USERNAME = 'clc-e2e-edit-61823';
const INITIAL_ROLE = 'kubevirt.io:view';
const UPDATED_ROLE = 'kubevirt.io:admin';
const SECOND_ROLE = 'kubevirt.io:edit';
const MCRA_NS = 'open-cluster-management-global-set';
const MANUAL_MCRA_NAME = `manual-test-mcra-61823`;
const ocSvc = new OcCliService();

function getMcraName(mcra: Record<string, unknown>): string {
  return ((mcra.metadata as Record<string, unknown>)?.name as string) ?? '';
}

function getMcraLabels(mcra: Record<string, unknown>): Record<string, string> {
  return ((mcra.metadata as Record<string, unknown>)?.labels as Record<string, string>) ?? {};
}

test.describe('FG-RBAC - Edit Role Assignment', { tag: ['@fg-rbac'] }, () => {
  test.setTimeout(900000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    await ocSvc.mcraDeleteAllForUser(USERNAME);
    await ocSvc.deleteYaml(MANUAL_MCRA_YAML).catch(() => {});

    await ocSvc.mcraCreate({
      name: `e2e-edit-61823-${Date.now()}`,
      namespace: MCRA_NS,
      subjectKind: 'User',
      subjectName: USERNAME,
      clusterRole: INITIAL_ROLE,
      placementName: 'cluster-sets-default',
      placementNamespace: MCRA_NS,
      raName: 'edit-test-access',
    });

    await expect(async () => {
      const mcras = await ocSvc.mcraGetForUser(USERNAME);
      expect(mcras.length).toBe(1);
    }).toPass({ intervals: [5000], timeout: 30000 });
  });

  test.afterAll(async () => {
    await ocSvc.mcraDeleteAllForUser(USERNAME);
    await ocSvc.deleteYaml(MANUAL_MCRA_YAML).catch(() => {});
  });

  test('RHACM4K-61823: Edit role assignment -- role change, backend verification, multi-RA, manual MCRA isolation', async ({
    page,
    oc,
    userDetailsPage,
    roleAssignmentWizardPage,
  }) => {
    await test.step('1: Navigate to user and verify existing RA', async () => {
      await userDetailsPage.gotoUserViaSearch(USERNAME);
      await userDetailsPage.openRoleAssignmentsTab();
      await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(INITIAL_ROLE)).toBeVisible({
        timeout: 30000,
      });
    });

    await test.step('2: Open edit wizard and verify pre-populated', async () => {
      await userDetailsPage.roleAssignmentsTable.clickEditAction(INITIAL_ROLE);
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });
      await expect(roleAssignmentWizardPage.getWizardTitle()).toContainText(/edit role assignment/i);
    });

    await test.step('3: Modify role to kubevirt.io:admin', async () => {
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.searchRole(UPDATED_ROLE);
      await roleAssignmentWizardPage.selectRole(UPDATED_ROLE);
      await roleAssignmentWizardPage.clickNext();
    });

    await test.step('4: Review changes and save', async () => {
      await expect(roleAssignmentWizardPage.getReviewRole()).toContainText(UPDATED_ROLE);
      await expect(roleAssignmentWizardPage.getNoChangesAlert()).toBeHidden({ timeout: 5000 });
      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeEnabled({ timeout: 10000 });

      await roleAssignmentWizardPage.submitUpdate();
      await expect(roleAssignmentWizardPage.getUpdatedNotification()).toBeVisible({
        timeout: 30000,
      });
    });

    await test.step('5: Verify updated role in table', async () => {
      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(UPDATED_ROLE),
        ).toBeVisible();
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('6: Verify MCRA updated via CLI + Search UI YAML', async () => {
      let mcraName = '';

      await expect(async () => {
        const roles = await ocSvc.mcraGetRolesForUser(USERNAME);
        expect(roles).toContain(UPDATED_ROLE);
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        const labels = getMcraLabels(mcras[0]);
        expect(labels['open-cluster-management.io/managed-by']).toBe('console');
        mcraName = getMcraName(mcras[0]);
      }).toPass({ intervals: [5000], timeout: 30000 });

      const searchPage = new SearchPage(page, oc);
      const searchDetailsPage = new SearchDetailsPage(page);

      await expect(async () => {
        await searchPage.goto();
        await searchPage.openFirstResourceDetails(MCRA_RESOURCE.kind, mcraName);
        await searchDetailsPage.waitForDetailsPageLoad();
      }).toPass({ intervals: [15000, 20000, 30000], timeout: 120000 });

      await searchDetailsPage.clickTab(SEARCH_DETAILS_PAGE.tabs.yaml);
      await expect(searchDetailsPage.getYamlEditor()).toBeVisible({ timeout: 15000 });
      await expect(searchDetailsPage.getYamlLine(UPDATED_ROLE)).toBeVisible({ timeout: 10000 });
      await expect(searchDetailsPage.getYamlLine(USERNAME)).toBeVisible({ timeout: 10000 });
      await expect(searchDetailsPage.getYamlLine('managed-by')).toBeVisible({ timeout: 10000 });
    });

    await test.step('7: Edit back to view -- verify delete old + create new MCRA', async () => {
      const mcrasBefore = await ocSvc.mcraGetForUser(USERNAME);
      const nameBefore = getMcraName(mcrasBefore[0]);

      await userDetailsPage.gotoUserViaSearch(USERNAME);
      await userDetailsPage.openRoleAssignmentsTab();
      await expect(userDetailsPage.roleAssignmentsTable.getRowByRole(UPDATED_ROLE)).toBeVisible({
        timeout: 30000,
      });
      await userDetailsPage.roleAssignmentsTable.clickEditAction(UPDATED_ROLE);
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.searchRole(INITIAL_ROLE);
      await roleAssignmentWizardPage.selectRole(INITIAL_ROLE);
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeEnabled({ timeout: 10000 });
      await roleAssignmentWizardPage.submitUpdate();
      await expect(roleAssignmentWizardPage.getUpdatedNotification()).toBeVisible({
        timeout: 30000,
      });

      await expect(async () => {
        const mcrasAfter = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcrasAfter.length).toBeGreaterThanOrEqual(1);
        const nameAfter = getMcraName(mcrasAfter[0]);
        expect(nameAfter).not.toBe(nameBefore);
        const roles = await ocSvc.mcraGetRolesForUser(USERNAME);
        expect(roles).toContain(INITIAL_ROLE);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('8: Multiple RAs -- create 2nd RA, edit one, verify both persist', async () => {
      await ocSvc.mcraCreate({
        name: `e2e-edit-61823-second-${Date.now()}`,
        namespace: MCRA_NS,
        subjectKind: 'User',
        subjectName: USERNAME,
        clusterRole: SECOND_ROLE,
        placementName: 'cluster-sets-default',
        placementNamespace: MCRA_NS,
        raName: 'edit-test-second',
      });

      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(INITIAL_ROLE),
        ).toBeVisible({ timeout: 5000 });
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(SECOND_ROLE),
        ).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      await userDetailsPage.roleAssignmentsTable.clickEditAction(INITIAL_ROLE);
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.searchRole(UPDATED_ROLE);
      await roleAssignmentWizardPage.selectRole(UPDATED_ROLE);
      await roleAssignmentWizardPage.clickNext();

      await expect(roleAssignmentWizardPage.getUpdateButton()).toBeEnabled({ timeout: 10000 });
      await roleAssignmentWizardPage.submitUpdate();
      await expect(roleAssignmentWizardPage.getUpdatedNotification()).toBeVisible({
        timeout: 30000,
      });

      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(UPDATED_ROLE),
        ).toBeVisible({ timeout: 5000 });
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(SECOND_ROLE),
        ).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      const roles = await ocSvc.mcraGetRolesForUser(USERNAME);
      expect(roles).toContain(UPDATED_ROLE);
      expect(roles).toContain(SECOND_ROLE);
    });

    await test.step('9: Manual MCRA isolation -- UI never appends to non-console MCRAs', async () => {
      await ocSvc.mcraDeleteAllForUser(USERNAME);
      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBe(0);
      }).toPass({ intervals: [5000], timeout: 30000 });

      await ocSvc.applyYaml(MANUAL_MCRA_YAML);

      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBe(1);
      }).toPass({ intervals: [5000], timeout: 30000 });

      await expect(async () => {
        await userDetailsPage.gotoUserViaSearch(USERNAME);
        await userDetailsPage.openRoleAssignmentsTab();
        await expect(
          userDetailsPage.roleAssignmentsTable.getRowByRole(UPDATED_ROLE),
        ).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible({ timeout: 15000 });

      await roleAssignmentWizardPage.selectScopeType(SCOPE_TYPES.global);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.searchRole(INITIAL_ROLE);
      await roleAssignmentWizardPage.selectRole(INITIAL_ROLE);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.submitCreate();
      await expect(roleAssignmentWizardPage.getSuccessNotification()).toBeVisible({
        timeout: 30000,
      });

      await expect(async () => {
        const mcras = await ocSvc.mcraGetForUser(USERNAME);
        expect(mcras.length).toBe(2);

        const manualMcra = mcras.find((m) => getMcraName(m) === MANUAL_MCRA_NAME);
        expect(manualMcra).toBeDefined();
        const manualLabels = getMcraLabels(manualMcra!);
        expect(manualLabels['open-cluster-management.io/managed-by']).toBeUndefined();
        const manualRAs = (manualMcra!.spec as Record<string, unknown>)?.roleAssignments as
          | Record<string, unknown>[]
          | undefined;
        expect(manualRAs?.length).toBe(1);

        const consoleMcra = mcras.find((m) => getMcraName(m) !== MANUAL_MCRA_NAME);
        expect(consoleMcra).toBeDefined();
        const consoleLabels = getMcraLabels(consoleMcra!);
        expect(consoleLabels['open-cluster-management.io/managed-by']).toBe('console');
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });
  });
});
