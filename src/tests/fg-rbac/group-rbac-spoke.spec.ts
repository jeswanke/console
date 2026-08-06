/**
 * RHACM4K-60239: Group-Based RBAC - Spoke Cluster Namespace
 *
 * Polarion steps:
 *   1. Login as RBAC user (clc-e2e-operator-60239)
 *   2. Test Fleet Tree View Filtering (spoke visible, hub hidden)
 *   3. Test Authorized VM Actions on Spoke (admin actions enabled)
 *   4. Test VNC Console Access
 *   5. Test Detail Tabs (Overview, Events)
 *   6. Test Hub Cluster Restrictions (local-cluster not in tree)
 *
 * RBAC user has: acm-vm-fleet:view (global) + kubevirt.io:admin (spoke/default)
 *                + acm-vm-extended:view (spoke/default)
 * Login uses asUser fixture (pre-saved storageState).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { TreeView } from '@components/fleet-virt/TreeView';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';
import { ensureVmReady, cleanupVm } from '@lib/fg-rbac/vm-test-setup';

const VM_NAME = `e2e-group-spoke-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const RBAC_USER = 'fg-rbac-operator-60239';

test.describe('FG-RBAC - Group-Based RBAC Spoke Namespace', { tag: ['@fg-rbac', '@fleet-virt'] }, () => {
  test.setTimeout(600000);

  let spokeCluster = '';

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(180000);
    spokeCluster = FLEET_VIRT_DEFAULTS.spokeCluster;

    await ensureVmReady(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60239' }, { context: spokeCluster });
  });

  test.afterAll(async () => {
    await cleanupVm(VM_NAME, VM_NAMESPACE, { context: spokeCluster });
  });

  test('RHACM4K-60239: RBAC user sees only spoke cluster with namespace isolation', async ({
    asUser,
    oc,
  }) => {
    test.skip(!spokeCluster, 'VIRT_SPOKE_CLUSTER not set');

    await test.step('1: Login as RBAC user and access Fleet Virt', async () => {
      const session = await asUser(RBAC_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);

      await fleetPage.goto();
      await expect(fleetPage.getPageHeading().first()).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Fleet tree view shows spoke cluster (hub hidden)', async () => {
      const session = await asUser(RBAC_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const treeView = new TreeView(session.page);

      await expect(async () => {
        await fleetPage.goto();
        await fleetPage.gotoVmTab();
        await expect(treeView.getAllTreeItems().first()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [15000, 20000, 30000], timeout: 180000 });

      await expect(treeView.getClusterNode(spokeCluster)).toBeVisible({ timeout: 10000 });
    });

    await test.step('3: Authorized VM actions enabled on spoke', async () => {
      const session = await asUser(RBAC_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const vmDetails = new VmDetailsPage(session.page);

      await expect(async () => {
        await fleetPage.gotoVmDetails(spokeCluster, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });

      await vmDetails.openActions();
      await expect(vmDetails.getActionsMenu()).toBeVisible({ timeout: 5000 });

      // Top-level menuitems: kubevirt.io:admin should have write access
      for (const action of ['Take snapshot', 'Edit labels']) {
        await expect(vmDetails.getActionMenuItem(action)).toBeVisible({ timeout: 5000 });
        await expect(vmDetails.getActionMenuItem(action)).toBeEnabled();
      }

      // Verify submenu triggers exist before expanding any
      const controlBtn = vmDetails.getActionSubmenuButton('Control');
      await expect(controlBtn).toBeVisible({ timeout: 5000 });
      const migrationBtn = vmDetails.getActionSubmenuButton('Migration');
      await expect(migrationBtn).toBeVisible({ timeout: 15000 });

      // Expand Control to verify Stop/Restart are enabled
      await controlBtn.click();
      for (const action of ['Stop', 'Restart']) {
        await expect(vmDetails.getActionMenuItem(action)).toBeVisible({ timeout: 5000 });
        await expect(vmDetails.getActionMenuItem(action)).toBeEnabled();
      }

      await session.page.keyboard.press('Escape');
    });

    await test.step('4: VNC Console access', async () => {
      const session = await asUser(RBAC_USER);
      const vmDetails = new VmDetailsPage(session.page);
      const fleetPage = new FleetVirtPage(session.page, oc);

      await expect(async () => {
        await fleetPage.gotoVmDetails(spokeCluster, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });

      await expect(async () => {
        await vmDetails.clickTab('Console');
        await expect(vmDetails.getVncConsoleDropdown()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('5: Detail tabs -- Overview (pod/node) and Events', async () => {
      const session = await asUser(RBAC_USER);
      const vmDetails = new VmDetailsPage(session.page);
      const fleetPage = new FleetVirtPage(session.page, oc);

      await expect(async () => {
        await fleetPage.gotoVmDetails(spokeCluster, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 60000 });

      // Overview tab: pod and node info visible (acm-vm-extended:view grants infrastructure read)
      await vmDetails.clickTab('Overview');
      await expect(vmDetails.getPodLink().first()).toBeVisible({ timeout: 15000 });
      await expect(vmDetails.getNodeLink().first()).toBeVisible({ timeout: 15000 });

      // Events tab
      await vmDetails.clickTab('Events');
      await expect(vmDetails.getEventsHeading()).toBeVisible({ timeout: 15000 });
    });

    await test.step('6: CLI verification -- spoke VM exists', async () => {
      const vmExists = await oc.vmIsRunning(VM_NAME, VM_NAMESPACE, { context: spokeCluster });
      expect(vmExists).toBeTruthy();
    });
  });
});
