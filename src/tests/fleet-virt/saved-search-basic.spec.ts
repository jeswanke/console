/**
 * RHACM4K-60769: Fleet Virtualization UI - Saved Searches: Basic
 *
 * Polarion steps:
 *   1. Navigate to Fleet Virt, go to VM tab, verify table has rows
 *   2. Select "Running" status filter
 *   3. Save search with a unique name
 *   4. Delete the saved search, verify it is removed
 *
 * Login is handled by the setup project (auth.setup.ts) via storageState.
 */

import { test, expect } from '@fixtures/fleet-virt-test';
import { OcCliService } from '@services/OcCliService';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_NAME = `e2e-saved-basic-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const ocSvc = new OcCliService();

test.describe('Fleet Virtualization - Saved Searches: Basic', { tag: ['@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(240000);

  const savedSearchName = `e2e-saved-search-${Date.now()}`;

  test.beforeAll(async () => {
    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60769' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60769: Save and delete a search', async ({ fleetVirtPage, statusFilter, savedSearches }) => {
    await test.step('1: Navigate to Fleet Virt VM tab and verify rows', async () => {
      await fleetVirtPage.goto();
      await fleetVirtPage.gotoVmTab();

      await expect(async () => {
        const rows = fleetVirtPage.getVmTableRows();
        await expect(rows.first()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('2: Apply Running status filter', async () => {
      await statusFilter.selectStatus('Running');

      await expect(async () => {
        const rows = fleetVirtPage.getVmTableRows();
        await expect(rows.first()).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('3: Save the current search', async () => {
      await savedSearches.saveSearch(savedSearchName, 'Basic saved search e2e test');
    });

    await test.step('4: Verify saved search appears and delete it', async () => {
      await expect(async () => {
        await fleetVirtPage.goto();
        await fleetVirtPage.gotoVmTab();
        await savedSearches.openSavedSearches();
        const item = savedSearches.getSavedSearchItem(savedSearchName);
        await expect(item).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      await savedSearches.removeSavedSearch(savedSearchName);

      await savedSearches.openSavedSearches();
      const item = savedSearches.getSavedSearchItem(savedSearchName);
      await expect(item).toBeHidden({ timeout: 10000 });
    });
  });
});
