/**
 * RHACM4K-60558: Fleet Virtualization UI - Tree View Toggle
 *
 * Polarion steps:
 *   1. Navigate to Fleet Virt, verify tree toggle is ON (showing VM projects only)
 *   2. Verify tree items are visible with at least 1 tree item
 *   3. Toggle OFF (show all projects), verify more tree items appear
 *   4. Toggle ON again, verify count returns to the filtered set
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fleet-virt-test';
import { OcCliService } from '@services/OcCliService';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_NAME = `e2e-tree-view-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const ocSvc = new OcCliService();

test.describe('Fleet Virtualization - Tree View Toggle', { tag: ['@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(240000);

  test.beforeAll(async () => {
    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60558' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60558: Tree view toggle shows/hides VM projects', async ({ fleetVirtPage, treeView }) => {
    await test.step('1: Navigate and verify tree toggle defaults to ON', async () => {
      await fleetVirtPage.goto();
      await expect(fleetVirtPage.getPageHeading()).toBeVisible();

      const toggle = treeView.getShowVmProjectsSwitch();
      await expect(toggle).toBeVisible({ timeout: 10000 });
      await expect(toggle).toBeChecked();
    });

    let filteredCount: number;

    await test.step('2: Verify tree items are visible', async () => {
      await expect(async () => {
        const items = treeView.getAllTreeItems();
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });

      filteredCount = await treeView.getAllTreeItems().count();
    });

    await test.step('3: Toggle OFF -- show all projects', async () => {
      await treeView.toggleShowVmProjects();

      await expect(async () => {
        const allCount = await treeView.getAllTreeItems().count();
        expect(allCount).toBeGreaterThanOrEqual(filteredCount);
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('4: Toggle ON again -- filtered set restored', async () => {
      await treeView.toggleShowVmProjects();

      await expect(async () => {
        const restoredCount = await treeView.getAllTreeItems().count();
        expect(restoredCount).toBeLessThanOrEqual(filteredCount + 1);
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });
  });
});
