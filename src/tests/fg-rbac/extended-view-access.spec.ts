/**
 * RHACM4K-60467: RBAC UI - Extended:view role infrastructure access
 *
 * Polarion steps:
 *   1. Log into hub (admin)
 *   2. Add extended:view role to user (via MCRA CLI)
 *   3. Add kubevirt.io:view role to user (via MCRA CLI)
 *   4. As RBAC user, verify Fleet Virt access with infrastructure read
 *
 * RBAC user: clc-e2e-view-cluster-59195
 * Roles: acm-vm-extended:view + kubevirt.io:view + acm-vm-fleet:view
 * Verifies: tree loads, VM visible, pod info visible, actions disabled,
 *           events tab loads, creation restricted.
 *
 * Login uses asUser fixture (pre-saved storageState).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { PodDetailsPage } from '@pages/fleet-virt/PodDetailsPage';
import { TreeView } from '@components/fleet-virt/TreeView';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';
import { ensureVmReady, cleanupVm } from '@lib/fg-rbac/vm-test-setup';

const VM_NAME = `e2e-extview-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = FLEET_VIRT_DEFAULTS.hubCluster;
const RBAC_USER = 'fg-rbac-view-cluster-59195';

test.describe('FG-RBAC - Extended:view Infrastructure Access', { tag: ['@fg-rbac', '@fleet-virt'] }, () => {
  test.setTimeout(600000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(180000);

    await ensureVmReady(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60467' });
  });

  test.afterAll(async () => {
    await cleanupVm(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60467: Extended:view user has read-only infrastructure access', async ({
    asUser,
    oc,
  }) => {
    const session = await asUser(RBAC_USER);
    const fleetPage = new FleetVirtPage(session.page, oc);
    const vmDetails = new VmDetailsPage(session.page);
    const treeView = new TreeView(session.page);

    await test.step('1: Verify Fleet Virt tree loads with VM visible', async () => {
      await expect(async () => {
        await fleetPage.goto();
        await fleetPage.gotoVmTab();
        await expect(treeView.getAllTreeItems().first()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [15000, 20000, 30000], timeout: 180000 });
    });

    await test.step('2: VM details page loads with infrastructure info', async () => {
      await expect(async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });
    });

    await test.step('3: VM actions disabled (view role = read-only)', async () => {
      // Page is already on VM details from Step 2
      await vmDetails.openActions();
      await expect(vmDetails.getActionsMenu()).toBeVisible({ timeout: 5000 });

      for (const action of ['Clone', 'Take snapshot', 'Edit labels', 'Delete']) {
        await expect(vmDetails.getActionMenuItem(action)).toBeVisible({ timeout: 5000 });
        await expect(vmDetails.getActionMenuItem(action)).toBeDisabled();
      }

      await session.page.keyboard.press('Escape');
    });

    await test.step('4: Events tab loads', async () => {
      await vmDetails.clickTab('Events');
      await expect(vmDetails.getEventsHeading()).toBeVisible({ timeout: 15000 });
    });

    await test.step('5: Console tab -- VNC console loads', async () => {
      await vmDetails.clickTab('Console');
      await expect(vmDetails.getVncConsoleDropdown()).toBeVisible({ timeout: 15000 });
    });

    await test.step('6: Snapshots tab -- view role cannot create snapshots', async () => {
      await vmDetails.clickTab('Snapshots');
      await expect(vmDetails.getSnapshotsHeading()).toBeVisible({ timeout: 15000 });
      await expect(vmDetails.getTakeSnapshotButton()).toBeVisible({ timeout: 5000 });

      const canCreateSnapshot = await oc.rbacAuthCanI(
        'create', 'virtualmachinesnapshots.snapshot.kubevirt.io', VM_NAMESPACE, 'clc-e2e-view-cluster-59195',
      );
      expect(canCreateSnapshot).toBe(false);
    });

    await test.step('7: Configuration tab -- read-only access', async () => {
      await vmDetails.clickTab('Configuration');

      await expect(vmDetails.getConfigSubTab('Details')).toBeVisible({ timeout: 15000 });

      // Verify Storage sub-tab is accessible (read-only)
      await vmDetails.clickConfigSubTab('Storage');
      await expect(vmDetails.getStorageContent().first()).toBeVisible({ timeout: 15000 });

      await expect(vmDetails.getAddDiskButton()).toBeVisible({ timeout: 5000 });
      await expect(vmDetails.getAddDiskButton()).toBeDisabled();

      // Verify Network sub-tab is accessible (read-only)
      await vmDetails.clickConfigSubTab('Network');
      await expect(vmDetails.getNetworkContent().first()).toBeVisible({ timeout: 15000 });
    });

    await test.step('8: Pod logs accessible via UI (acm-vm-extended:view)', async () => {
      const podDetails = new PodDetailsPage(session.page);

      // Switch to Overview tab (page is still on VM details from Step 7)
      await vmDetails.clickTab('Overview');
      await expect(vmDetails.getPodLink()).toBeVisible({ timeout: 15000 });

      await expect(vmDetails.getNodeLink().first()).toBeVisible({ timeout: 10000 });

      // Click pod link to navigate to OCP Pod details page
      await vmDetails.getPodLink().click();
      await expect(podDetails.getPodHeading()).toBeVisible({ timeout: 15000 });

      // Verify Logs tab is accessible
      await podDetails.clickLogsTab();
      await expect(podDetails.getLogViewer().first()).toBeVisible({ timeout: 15000 });
    });

    await test.step('9: CLI verification -- read=yes, write=no', async () => {
      const canGetVMs = await oc.rbacAuthCanI(
        'get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-view-cluster-59195',
      );
      expect(canGetVMs).toBe(true);

      const canCreateVMs = await oc.rbacAuthCanI(
        'create', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-view-cluster-59195',
      );
      expect(canCreateVMs).toBe(false);

      const canDeleteVMs = await oc.rbacAuthCanI(
        'delete', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-view-cluster-59195',
      );
      expect(canDeleteVMs).toBe(false);

      const canCreateConfigMaps = await oc.rbacAuthCanI(
        'create', 'configmaps', VM_NAMESPACE, 'clc-e2e-view-cluster-59195',
      );
      expect(canCreateConfigMaps).toBe(false);

      const canCreateSecrets = await oc.rbacAuthCanI(
        'create', 'secrets', VM_NAMESPACE, 'clc-e2e-view-cluster-59195',
      );
      expect(canCreateSecrets).toBe(false);
    });
  });
});
