/**
 * RHACM4K-60559: Fleet Virtualization UI - VM Creation
 *
 * Polarion steps:
 *   1. Navigate to Fleet Virt, click Create VirtualMachine
 *   2. Walk through the creation wizard (OS, boot source, compute, name)
 *   3. Verify VM reaches Running status
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fleet-virt-test';
import { OcCliService } from '@services/OcCliService';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_NAME = `e2e-create-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const ocSvc = new OcCliService();

test.describe('Fleet Virtualization - VM Creation', { tag: ['@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(300000);

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60559: Create a VM via Fleet Virtualization UI', async ({
    fleetVirtPage,
    vmCreationPage,
    vmDetailsPage,
  }) => {
    await test.step('1: Navigate to Fleet Virt and open creation wizard', async () => {
      await fleetVirtPage.goto();
      await fleetVirtPage.clickCreateVM();
    });

    await test.step('2: Walk through creation wizard and create VM', async () => {
      await vmCreationPage.createVmQuickPath(VM_NAME);
    });

    await test.step('3: Verify VM reaches Running status', async () => {
      await expect(async () => {
        const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
        expect(running).toBeTruthy();
      }).toPass({ intervals: [10000, 15000, 20000], timeout: 180000 });

      await fleetVirtPage.gotoVmDetails('local-cluster', VM_NAMESPACE, VM_NAME);
      await expect(vmDetailsPage.getPageHeading()).toBeVisible({ timeout: 30000 });
    });
  });
});
