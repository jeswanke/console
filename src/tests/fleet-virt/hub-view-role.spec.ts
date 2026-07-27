/**
 * RHACM4K-60310: Fleet Virtualization UI - Hub View Role (limited access)
 *
 * Polarion steps:
 *   1. Login as hub-view-60310 RBAC user, navigate to Fleet Virt
 *   2. Go to VM tab, expand tree, click project
 *   3. Verify VM table has rows
 *   4. Click first VM to go to details
 *   5. Verify action buttons are disabled (view-only role)
 *   6. Click Console tab, verify VNC is not fully accessible
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState for admin.
 * RBAC user login uses the asUser fixture (loads pre-saved storageState, no live OAuth).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { OcCliService } from '@services/OcCliService';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { TreeView } from '@components/fleet-virt/TreeView';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_NAME = `e2e-hub-view-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Hub View Role Limited Access', { tag: ['@fg-rbac', '@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(300000);

  test.beforeAll(async () => {
    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60310' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60310: Hub view role has read-only access to Fleet Virt', async ({ asUser, oc }) => {
    const rbacSession = await asUser('fg-rbac-hub-view-60310');
    const fleetVirtPage = new FleetVirtPage(rbacSession.page, oc);
    const vmDetailsPage = new VmDetailsPage(rbacSession.page);
    const treeView = new TreeView(rbacSession.page);

    await test.step('1: Navigate to Fleet Virtualization', async () => {
      await fleetVirtPage.goto();
      await expect(fleetVirtPage.getPageHeading()).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Go to VM tab and navigate tree', async () => {
      await fleetVirtPage.gotoVmTab();
      // Wait for kubevirtprojects API to index the namespace (propagation delay)
      await expect(async () => {
        await treeView.expandCluster('local-cluster');
        await treeView.clickProject('local-cluster', VM_NAMESPACE);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('3: Verify VM table has rows', async () => {
      await expect(async () => {
        const rows = fleetVirtPage.getVmTableRows();
        await expect(rows.first()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('4: Navigate to VM details', async () => {
      await fleetVirtPage.clickFirstVmInTable();
      await vmDetailsPage.dismissWelcomeModal();

      await expect(async () => {
        await expect(vmDetailsPage.getPageHeading()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('5: Verify action buttons are disabled for view-only user', async () => {
      // View-only user: all action buttons render as visible but disabled
      await expect(vmDetailsPage.getStartButton()).toBeVisible();
      await expect(vmDetailsPage.getStartButton()).toBeDisabled();

      await expect(vmDetailsPage.getStopButton()).toBeVisible();
      await expect(vmDetailsPage.getStopButton()).toBeDisabled();

      await expect(vmDetailsPage.getPauseButton()).toBeVisible();
      await expect(vmDetailsPage.getPauseButton()).toBeDisabled();

      await expect(vmDetailsPage.getRestartButton()).toBeVisible();
      await expect(vmDetailsPage.getRestartButton()).toBeDisabled();
    });

    await test.step('6: Verify Console tab - VNC denied for view-only user', async () => {
      await vmDetailsPage.getTabLink('Console').click();
      await rbacSession.page.waitForURL('**/console**', { timeout: 15000 });

      // VNC auto-connects on mount; for view-only user it fails (403) because
      // kubevirt.io:view does not include subresources.kubevirt.io/virtualmachineinstances/vnc.
      // The Disconnect button is ALWAYS rendered (never hidden) — it's disabled when not connected.
      await expect(async () => {
        await expect(vmDetailsPage.getVncDisconnectedText()).toBeVisible();
        await expect(vmDetailsPage.getVncConnectButton()).toBeVisible();
        await expect(vmDetailsPage.getVncDisconnectButton()).toBeDisabled();
      }).toPass({ intervals: [3000, 5000, 7000], timeout: 25000 });
    });
  });
});
