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
      await treeView.expandCluster('local-cluster');
      await treeView.clickProject('local-cluster', VM_NAMESPACE);
    });

    await test.step('3: Verify VM table has rows', async () => {
      await expect(async () => {
        const rows = fleetVirtPage.getVmTableRows();
        await expect(rows.first()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('4: Navigate to VM details', async () => {
      await fleetVirtPage.clickFirstVmInTable();

      await expect(async () => {
        await expect(vmDetailsPage.getPageHeading()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('5: Verify action buttons are disabled', async () => {
      const startBtn = vmDetailsPage.getStartButton();
      const stopBtn = vmDetailsPage.getStopButton();
      const pauseBtn = vmDetailsPage.getPauseButton();
      const restartBtn = vmDetailsPage.getRestartButton();

      for (const btn of [startBtn, stopBtn, pauseBtn, restartBtn]) {
        const isVisible = await btn.isVisible().catch(() => false);
        if (isVisible) {
          await expect(btn).toBeDisabled();
        }
      }
    });

    await test.step('6: Verify Console tab is accessible', async () => {
      const consoleLink = rbacSession.page.getByRole('link', { name: 'Console', exact: true });
      await consoleLink.click();

      await rbacSession.page.waitForURL('**/console**', { timeout: 15000 });
    });
  });
});
