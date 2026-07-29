/**
 * RHACM4K-60560: Fleet Virtualization UI - Status Filter
 *
 * Polarion steps:
 *   1. Navigate to Fleet Virtualization, go to VM tab
 *   2. Select "Running" status filter, verify filtered rows exist
 *   3. Clear filter, select "Stopped" -- verify (empty is acceptable)
 *   4. Clear all filters
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fleet-virt-test';
import { OcCliService } from '@services/OcCliService';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_NAME = `e2e-status-filter-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const ocSvc = new OcCliService();

test.describe('Fleet Virtualization - Status Filter', { tag: ['@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(240000);

  test.beforeAll(async () => {
    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60560' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60560: Filter VMs by status', async ({ fleetVirtPage, statusFilter }) => {
    await test.step('1: Navigate to Fleet Virtualization VM tab', async () => {
      await fleetVirtPage.goto();
      await fleetVirtPage.gotoVmTab();
      await expect(fleetVirtPage.getPageHeading()).toBeVisible();
    });

    await test.step('2: Filter by Running status and verify results', async () => {
      await statusFilter.selectStatus('Running');

      await expect(async () => {
        const rows = fleetVirtPage.getVmTableRows();
        await expect(rows.first()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('3: Clear filter and select Stopped status', async () => {
      await statusFilter.clearAllFilters();
      await statusFilter.selectStatus('Stopped');

      // Stopped VMs may or may not exist -- just verify the filter applied
      await expect(statusFilter.getStatusButton()).toBeVisible();
    });

    await test.step('4: Clear all filters', async () => {
      await statusFilter.clearAllFilters();
      await expect(fleetVirtPage.getPageHeading()).toBeVisible();
    });
  });
});
