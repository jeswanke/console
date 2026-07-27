/**
 * RHACM4K-60772: Fleet Virtualization - Clone VM + Delete
 *
 * Polarion steps:
 *   1. Create VM in beforeAll, navigate to VM details
 *   2. Actions → Clone → fill clone name, check "Start on clone" → Clone
 *   3. Verify clone appears and reaches Running
 *   4. Stop clone, delete clone
 *   5. Verify clone is gone
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fleet-virt-test';
import { OcCliService } from '@services/OcCliService';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_NAME = `e2e-clone-src-${Date.now()}`;
const CLONE_NAME = `e2e-clone-dst-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = 'local-cluster';
const ocSvc = new OcCliService();

test.describe('Fleet Virtualization - Clone VM + Delete', { tag: ['@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(900000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(600000);
    await ocSvc.vmEnsureTestVMWithPVC(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60772' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [10000, 20000, 30000], timeout: 300000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
    await ocSvc.vmDeleteTestVM(CLONE_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60772: Clone a VM and delete the clone', async ({
    fleetVirtPage,
    vmDetailsPage,
    vmCloneModal,
  }) => {
    await test.step('1: Navigate to source VM details', async () => {
      await fleetVirtPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
      await expect(vmDetailsPage.getPageHeading()).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Clone the VM', async () => {
      await vmDetailsPage.clickCloneAction();
      await expect(vmCloneModal.getContainer()).toBeVisible({ timeout: 10000 });
      await vmCloneModal.fillCloneName(CLONE_NAME);
      await vmCloneModal.checkStartOnClone();
      await vmCloneModal.clickSave();
    });

    await test.step('3: Verify clone reaches Running status', async () => {
      await expect(async () => {
        const running = await ocSvc.vmIsRunning(CLONE_NAME, VM_NAMESPACE);
        expect(running).toBeTruthy();
      }).toPass({ intervals: [10000, 15000, 20000], timeout: 180000 });
    });

    await test.step('4: Navigate to clone and stop it', async () => {
      await fleetVirtPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, CLONE_NAME);
      await expect(vmDetailsPage.getPageHeading()).toBeVisible({ timeout: 30000 });
      await vmDetailsPage.clickActionButton('stop');

      await expect(async () => {
        await expect(vmDetailsPage.getStatusLabel()).toContainText('Stopped', { timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('5: Delete the clone', async () => {
      await vmDetailsPage.clickDeleteAction();
      await vmDetailsPage.confirmDelete();
    });

    await test.step('6: Verify clone is deleted', async () => {
      await expect(async () => {
        const exists = await ocSvc.run(
          `oc get vm ${CLONE_NAME} -n ${VM_NAMESPACE} --no-headers 2>/dev/null || true`
        );
        expect(exists).not.toContain(CLONE_NAME);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });
  });
});
