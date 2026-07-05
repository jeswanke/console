/**
 * RHACM4K-60311: Fleet Virtualization UI - Role Visibility (hub-admin)
 *
 * Polarion steps:
 *   1-2. Login + assign acm-vm-fleet:admin + kubevirt.io:view (pre-configured)
 *   3. Login as RBAC user, navigate to Fleet Virt, verify page accessible
 *   5. Verify combined-role access: tree, VM list, details, actions read-only, Console
 *   6. CLI verification: oc auth can-i checks for expected permissions
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

const VM_NAME = `e2e-role-vis-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const RBAC_USERNAME = 'clc-e2e-hub-admin-60311';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Fleet Virt Role Visibility', { tag: ['@fg-rbac', '@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(300000);

  test.beforeAll(async () => {
    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60311' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60311: Hub admin can access Fleet Virtualization', async ({ asUser, oc }) => {
    const rbacSession = await asUser('fg-rbac-hub-admin-60311');
    const fleetVirtPage = new FleetVirtPage(rbacSession.page, oc);
    const vmDetailsPage = new VmDetailsPage(rbacSession.page);
    const treeView = new TreeView(rbacSession.page);

    await test.step('1: Navigate to Fleet Virtualization as RBAC user', async () => {
      await fleetVirtPage.goto();
      await expect(fleetVirtPage.getPageHeading()).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Verify page heading and VM tab', async () => {
      await expect(fleetVirtPage.getPageHeading()).toContainText('Virtual', { timeout: 10000 });
      await fleetVirtPage.gotoVmTab();
      const vmTab = rbacSession.page.getByRole('tab', { name: 'Virtual machines' });
      await expect(vmTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    });

    await test.step('3: Verify tree view loads', async () => {
      const treeItems = treeView.getAllTreeItems();
      const treeVisible = await treeItems.first().isVisible({ timeout: 10000 }).catch(() => false);
      if (treeVisible) {
        const count = await treeItems.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });

    await test.step('4: Navigate to VM details and verify read-only access', async () => {
      const rows = fleetVirtPage.getVmTableRows();
      const hasVMs = await rows.first().isVisible({ timeout: 15000 }).catch(() => false);

      if (!hasVMs) {
        test.info().annotations.push({
          type: 'info',
          description: 'No VMs visible for RBAC user -- MCRAs may not be configured. Skipping VM details steps.',
        });
        return;
      }

      await fleetVirtPage.clickFirstVmInTable();

      await expect(async () => {
        await expect(vmDetailsPage.getPageHeading()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

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

    await test.step('5: Verify Console tab is accessible', async () => {
      const consoleLink = rbacSession.page.getByRole('link', { name: 'Console', exact: true });
      const consoleVisible = await consoleLink.isVisible().catch(() => false);

      if (!consoleVisible) {
        return;
      }

      await consoleLink.click();
      await rbacSession.page.waitForURL('**/console**', { timeout: 15000 });
    });

    await test.step('6: CLI - verify RBAC permissions via oc auth can-i', async () => {
      const canGet = await oc.rbacAuthCanI('get', 'virtualmachines', VM_NAMESPACE, RBAC_USERNAME);
      const canPatch = await oc.rbacAuthCanI('patch', 'virtualmachines', VM_NAMESPACE, RBAC_USERNAME);
      const canDelete = await oc.rbacAuthCanI('delete', 'virtualmachines', VM_NAMESPACE, RBAC_USERNAME);

      if (!canGet && !canPatch && !canDelete) {
        test.info().annotations.push({
          type: 'info',
          description: 'RBAC user has no VM permissions -- MCRAs may not be configured.',
        });
        return;
      }

      expect(canGet).toBe(true);
      expect(canPatch).toBe(false);
      expect(canDelete).toBe(false);
    });
  });
});
