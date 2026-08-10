/**
 * RHACM4K-60468: RBAC UI - Validate acm-vm-extended:admin role
 *
 * Polarion steps:
 *   1. Log into hub
 *   2. Assign acm-vm-extended:admin + kubevirt.io:view roles
 *   3. Assign kubevirt.io:view (companion role)
 *   4. Login as RBAC user, verify Fleet Virt access + permission restrictions:
 *      - Navigate to Fleet Virt, verify tree and VM list
 *      - Click VM, verify actions are disabled (kubevirt:view = read-only)
 *      - Verify Console tab (VNC not accessible with view role)
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState for admin.
 * RBAC user login uses the asUser fixture (loads pre-saved storageState, no live OAuth).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { OcCliService } from '@services/OcCliService';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';

const VM_NAME = `e2e-managed-admin-${Date.now()}`;
const VM_NAMESPACE = 'default';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Managed Admin Full Access', { tag: ['@fg-rbac', '@fleet-virt'] }, () => {
  test.setTimeout(900000);

  const spokeCluster = process.env.RBAC_SPOKE_CLUSTER || process.env.VIRT_SPOKE_CLUSTER || '';

  test.beforeAll(async () => {
    if (!spokeCluster) return;
    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, {
      'test-case': 'rhacm4k-60468',
    }, { context: spokeCluster });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE, { context: spokeCluster });
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    if (!spokeCluster) return;
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE, { context: spokeCluster });
  });

  test('RHACM4K-60468: Validate acm-vm-extended:admin with kubevirt.io:view', async ({
    userDetailsPage,
    roleAssignmentWizardPage,
    rbacConfig,
    asUser,
    oc,
  }) => {
    const user = rbacConfig.users['managed-admin-60468'];
    const spoke = rbacConfig.spokeCluster;

    test.skip(!spoke, 'RBAC_SPOKE_CLUSTER not set -- need a spoke cluster for this test');

    // -- Polarion Step 1: Log into hub (handled by storageState) --

    // -- Polarion Step 2: Assign acm-vm-extended:admin on spoke --
    await test.step('1: Assign acm-vm-extended:admin role on spoke', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeClusters();
      await roleAssignmentWizardPage.selectClusters([spoke]);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.searchRole('acm-vm-extended:admin');
      await roleAssignmentWizardPage.selectRole('acm-vm-extended:admin');
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(
        roleAssignmentWizardPage
          .getSuccessNotification()
          .or(roleAssignmentWizardPage.getDuplicateError())
      ).toBeVisible({ timeout: 30000 });
    });

    // -- Polarion Step 3: Assign kubevirt.io:view on spoke --
    await test.step('2: Assign kubevirt.io:view role on spoke', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.selectScopeClusters();
      await roleAssignmentWizardPage.selectClusters([spoke]);
      await roleAssignmentWizardPage.clickNext();
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.searchRole('kubevirt.io:view');
      await roleAssignmentWizardPage.selectRole('kubevirt.io:view');
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(
        roleAssignmentWizardPage
          .getSuccessNotification()
          .or(roleAssignmentWizardPage.getDuplicateError())
      ).toBeVisible({ timeout: 30000 });
    });

    // -- Prerequisite: Assign hub fleet view for tree access --
    await test.step('2b: Assign acm-vm-fleet:view on local-cluster', async () => {
      await userDetailsPage.gotoRoleAssignments(user);
      await userDetailsPage.openCreateRoleAssignment();
      await expect(roleAssignmentWizardPage.getModal()).toBeVisible();

      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.searchRole('acm-vm-fleet:view');
      await roleAssignmentWizardPage.selectRole('acm-vm-fleet:view');
      await roleAssignmentWizardPage.clickNext();

      await roleAssignmentWizardPage.submitCreate();
      await expect(
        roleAssignmentWizardPage
          .getSuccessNotification()
          .or(roleAssignmentWizardPage.getDuplicateError())
      ).toBeVisible({ timeout: 30000 });
    });

    // Wait for all MCRAs to reach Applied status before checking visibility
    await expect(async () => {
      const userMCRAs = await oc.mcraGetForUser(user);
      expect(userMCRAs.length).toBeGreaterThanOrEqual(1);
      for (const mcra of userMCRAs) {
        const conditions = (mcra.status as Record<string, unknown>)?.conditions as Record<string, unknown>[] | undefined;
        const applied = conditions?.find((c) => c.type === 'Applied');
        expect(applied?.status).toBe('True');
      }
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });

    // -- Polarion Step 4: Login as RBAC user, verify access --
    const rbacSession = await asUser('fg-rbac-managed-admin-60468');
    const fleetVirtPage = new FleetVirtPage(rbacSession.page, oc);
    const vmDetailsPage = new VmDetailsPage(rbacSession.page);

    let vmName = '';
    await test.step('3a: Navigate to Fleet Virt and verify VM list', async () => {
      await expect(async () => {
        await fleetVirtPage.goto();
        await fleetVirtPage.gotoVmTab();
        await expect(fleetVirtPage.getNoVMsEmptyState()).toBeHidden({ timeout: 15000 });
        const info = await fleetVirtPage.getFirstVmInfo();
        vmName = info.name;
      }).toPass({ intervals: [10000, 15000, 30000], timeout: 120000 });
    });

    await test.step('3b: Navigate to VM details page', async () => {
      await expect(async () => {
        await fleetVirtPage.gotoVmDetails(spoke, VM_NAMESPACE, vmName);
        await expect(vmDetailsPage.getPageHeading()).toContainText(vmName, { timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 60000 });
    });

    await test.step('3c: Verify VM actions are restricted', async () => {
      await expect(vmDetailsPage.getActionsDropdown()).toBeVisible({ timeout: 15000 });
      await vmDetailsPage.openActions();
      await expect(vmDetailsPage.getActionsMenu()).toBeVisible({ timeout: 10000 });

      const editLabels = vmDetailsPage.getActionMenuItem('Edit labels');
      await expect(editLabels).toBeVisible({ timeout: 5000 });
      await expect(editLabels).toBeDisabled();

      await rbacSession.page.keyboard.press('Escape');
    });

    await test.step('3d: Verify Console tab', async () => {
      await vmDetailsPage.clickTab('Console');

      await expect(vmDetailsPage.getVncConsoleDropdown()).toBeVisible({
        timeout: 15000,
      });
      await expect(vmDetailsPage.getGuestLoginCredentials()).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step('3e: Verify Events tab', async () => {
      await vmDetailsPage.clickTab('Events');

      await expect(vmDetailsPage.getEventsSection()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step('3f: Verify Snapshots tab', async () => {
      await vmDetailsPage.clickTab('Snapshots');

      await expect(vmDetailsPage.getSnapshotsList()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step('3g: Verify Configuration tab and storage', async () => {
      await vmDetailsPage.clickTab('Configuration');
      await vmDetailsPage.waitForLoad();

      await expect(vmDetailsPage.getConfigurationTab()).toBeVisible();
    });

    await test.step('4: Verify MCRAs exist for managed-admin user', async () => {
      const userMCRAs = await oc.mcraGetForUser(user);
      expect(userMCRAs.length).toBeGreaterThanOrEqual(1);

      const roles = await oc.mcraGetRolesForUser(user);
      expect(roles).toContain('acm-vm-fleet:view');
    });

  });

  test.afterEach(async ({ oc, rbacConfig }) => {
    await oc.mcraDeleteAllForUser(rbacConfig.users['managed-admin-60468']);
  });
});
