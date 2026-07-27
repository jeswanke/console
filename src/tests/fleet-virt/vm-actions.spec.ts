/**
 * RHACM4K-60771: Fleet Virtualization UI - VM Lifecycle Actions
 *
 * Polarion steps:
 *   1. Navigate to Fleet Virt, go to VM tab
 *   2. Navigate to VM details page
 *   3. Pause the VM, verify status changes to Paused
 *   4. Restart the VM, verify status returns to Running
 *   5. Stop the VM, verify status changes to Stopped
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fleet-virt-test';
import { OcCliService } from '@services/OcCliService';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_NAME = `e2e-vm-actions-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const ocSvc = new OcCliService();

test.describe('Fleet Virtualization - VM Lifecycle Actions', { tag: ['@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(300000);

  test.beforeAll(async () => {
    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60771' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60771: Pause, restart, and stop a VM', async ({ fleetVirtPage, vmDetailsPage }) => {
    await test.step('1: Navigate to Fleet Virtualization VM tab', async () => {
      await fleetVirtPage.goto();
      await fleetVirtPage.gotoVmTab();
      await expect(fleetVirtPage.getPageHeading()).toBeVisible();
    });

    await test.step('2: Navigate to VM details', async () => {
      await fleetVirtPage.gotoVmDetails('local-cluster', VM_NAMESPACE, VM_NAME);
      await expect(vmDetailsPage.getPageHeading()).toBeVisible({ timeout: 30000 });
    });

    await test.step('3: Pause VM and verify status', async () => {
      await vmDetailsPage.clickActionButton('pause');

      await expect(async () => {
        await expect(vmDetailsPage.getStatusLabel()).toContainText('Paused', { timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('4: Restart VM and verify Running status', async () => {
      await vmDetailsPage.clickActionButton('restart');

      await expect(async () => {
        await expect(vmDetailsPage.getStatusLabel()).toContainText('Running', { timeout: 5000 });
      }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
    });

    await test.step('5: Stop VM and verify Stopped status', async () => {
      await vmDetailsPage.clickActionButton('stop');

      await expect(async () => {
        await expect(vmDetailsPage.getStatusLabel()).toContainText('Stopped', { timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });
  });
});
