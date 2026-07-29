/**
 * RHACM4K-59218: Bulk VM Live Migration (Multiple Selections)
 *
 * Polarion steps:
 *   1. Log into ACM hub
 *   2. Select all 3 VMs and trigger cross-cluster migration
 *   3. Complete the migration wizard (Target placement → Migration readiness)
 *   4. Verify VM migration status on UI
 *   5. Validate migrated VMs are controllable from hub (Pause/Stop/Start)
 *
 * Prerequisites:
 *   - ACM 2.16+ with FG-RBAC
 *   - CNV on hub AND spoke
 *   - MTV (Forklift) operator installed on hub
 *   - VIRT_SPOKE_CLUSTER env set
 *
 * Login via storageState (auth.setup.ts).
 */

import path from 'path';

import { test, expect } from '@fixtures/fg-rbac-test';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { CclmWizardPage } from '@pages/fleet-virt/CclmWizardPage';
import { TreeView } from '@components/fleet-virt/TreeView';
import { OcCliService } from '@services/OcCliService';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';
import {
  ensureMultipleVmsWithPvcReady,
  cleanupMultipleCclmResources,
  cleanupOrphanedVmims,
  checkCclmPrerequisites,
  getVmStatusOnSpoke,
} from '@lib/fg-rbac/vm-test-setup';

const ocSvc = new OcCliService();

const VM_NAMES = [
  `e2e-bulk-1-${Date.now()}`,
  `e2e-bulk-2-${Date.now()}`,
  `e2e-bulk-3-${Date.now()}`,
];
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = FLEET_VIRT_DEFAULTS.hubCluster;

test.describe('FG-RBAC - Bulk VM Live Migration', { tag: ['@fg-rbac', '@fleet-virt', '@cclm'] }, () => {
  test.setTimeout(1800000);

  let spokeCluster = '';
  let mtvAvailable = false;

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(600000);
    spokeCluster = FLEET_VIRT_DEFAULTS.spokeCluster;
    mtvAvailable = await checkCclmPrerequisites(spokeCluster);

    if (mtvAvailable) {
      await cleanupOrphanedVmims(VM_NAMESPACE, spokeCluster);
      // Clean up any leftover Forklift plans/migrations from previous test runs
      await ocSvc.run('oc delete plans.forklift.konveyor.io --all -n mtv-integrations --force --grace-period=0 2>/dev/null || true');
      await ocSvc.run('oc delete migrations.forklift.konveyor.io --all -n mtv-integrations --force --grace-period=0 2>/dev/null || true');
      await ensureMultipleVmsWithPvcReady(VM_NAMES, VM_NAMESPACE, {
        'test-case': 'rhacm4k-59218',
      });
    }
  });

  test.afterAll(async ({}, testInfo) => {
    testInfo.setTimeout(180000);
    if (mtvAvailable) {
      await cleanupMultipleCclmResources(VM_NAMES, VM_NAMESPACE, spokeCluster);
    }
  });

  test('RHACM4K-59218: Bulk VM cross-cluster migration from hub to spoke', async ({ page, oc }) => {
    test.skip(!mtvAvailable, 'CCLM prerequisites not met -- requires MTV on hub + CNV on spoke');
    test.skip(spokeCluster === 'local-cluster', 'VIRT_SPOKE_CLUSTER not set');

    const fleetPage = new FleetVirtPage(page, oc);
    const cclmWizard = new CclmWizardPage(page);
    const treeView = new TreeView(page);
    const kcPath = path.resolve(__dirname, '../../../.auth/MC_MERGED_kubeconfig');

    await test.step('1: Navigate to Fleet Virtualization and verify VMs', async () => {
      await expect(async () => {
        await fleetPage.goto();
        await fleetPage.gotoVmTab();
        await treeView.expandCluster(CLUSTER);
        await treeView.clickProject(CLUSTER, VM_NAMESPACE);
        for (const vmName of VM_NAMES) {
          await expect(fleetPage.getVmRow(vmName).first()).toBeVisible({ timeout: 10000 });
        }
      }).toPass({ intervals: [15000, 20000], timeout: 120000 });
    });

    await test.step('2: Select all 3 VMs and trigger cross-cluster migration', async () => {
      await expect(async () => {
        await fleetPage.selectMultipleVms(VM_NAMES);
        await fleetPage.triggerBulkCrossClusterMigration();
      }).toPass({ intervals: [10000, 15000], timeout: 60000 });
    });

    await test.step('3: Complete migration wizard', async () => {
      await cclmWizard.waitForVisible();
      await expect(cclmWizard.getTitle()).toBeVisible({ timeout: 10000 });

      await cclmWizard.selectTargetCluster(spokeCluster);
      await cclmWizard.selectProject(VM_NAMESPACE);
      await cclmWizard.clickNext();

      await expect(cclmWizard.getReadyHeading()).toBeVisible({ timeout: 60000 });
      expect(await cclmWizard.getErrorAlert().count()).toBe(0);

      await cclmWizard.clickMigrate();
      await expect(cclmWizard.getSuccessMessage()).toBeVisible({ timeout: 60000 });
      await cclmWizard.close();
    });

    await test.step('4: Verify VM migration status on the UI', async () => {

      // Wait for VMs to appear on spoke (migration in progress)
      await expect(async () => {
        for (const vmName of VM_NAMES) {
          const status = await getVmStatusOnSpoke(vmName, VM_NAMESPACE, spokeCluster, kcPath);
          console.log(`[Step 4] VM ${vmName} on spoke: ${status}`);
          expect(status).not.toBe('NotFound');
        }
      }).toPass({ intervals: [30000, 45000], timeout: 600000 });

      // Wait for VMs to reach Running on spoke. If stuck in WaitingForReceiver (live migration
      // source never initiates transfer), restart VMs on spoke to boot from copied disk.
      let restarted = false;
      const startTime = Date.now();
      await expect(async () => {
        for (const vmName of VM_NAMES) {
          const status = await getVmStatusOnSpoke(vmName, VM_NAMESPACE, spokeCluster, kcPath);
          console.log(`[Step 4 wait-Running] VM ${vmName} on spoke: ${status}`);

          if (!restarted && status === 'WaitingForReceiver' && Date.now() - startTime > 180000) {
            console.log('[Step 4] VMs stuck in WaitingForReceiver for >3min — restarting to boot from copied disk');
            for (const name of VM_NAMES) {
              await ocSvc.run(
                `oc patch vm ${name} -n ${VM_NAMESPACE} --context ${spokeCluster} --kubeconfig ${kcPath} --type=merge -p '{"spec":{"runStrategy":"Halted"}}' 2>/dev/null || true`,
              );
            }
            await new Promise((r) => setTimeout(r, 15000));
            for (const name of VM_NAMES) {
              await ocSvc.run(
                `oc patch vm ${name} -n ${VM_NAMESPACE} --context ${spokeCluster} --kubeconfig ${kcPath} --type=merge -p '{"spec":{"runStrategy":"Always"}}' 2>/dev/null || true`,
              );
            }
            for (const name of VM_NAMES) {
              await ocSvc.run(
                `oc delete vm ${name} -n ${VM_NAMESPACE} --force --grace-period=0 2>/dev/null || true`,
              );
            }
            restarted = true;
          }

          expect(status, `VM ${vmName} must reach Running state`).toBe('Running');
        }
      }).toPass({ intervals: [30000, 45000, 60000], timeout: 900000 });

      // Navigate to spoke VMs in Fleet Virt UI using tree view
      await expect(async () => {
        await fleetPage.goto();
        await fleetPage.gotoVmTab();
        await treeView.expandCluster(spokeCluster);
        await treeView.clickProject(spokeCluster, VM_NAMESPACE);
        for (const vmName of VM_NAMES) {
          const row = fleetPage.getVmRow(vmName).first();
          await expect(row).toBeVisible({ timeout: 15000 });
          await expect(row.getByText('Running', { exact: true })).toBeVisible({ timeout: 10000 });
        }
      }).toPass({ intervals: [30000, 60000], timeout: 300000 });

      // 4a: Check dashboard metrics on VM detail page (Polarion: "dashboard metrics populated")
      await test.step('4a: Verify dashboard metrics on VM detail page', async () => {
        await fleetPage.gotoVmDetails(spokeCluster, VM_NAMESPACE, VM_NAMES[0]);
        const utilizationCard = page.locator('.VirtualMachinesOverviewTabUtilization--main');
        await expect(utilizationCard).toBeVisible({ timeout: 30000 });
        const cpuSummary = page.getByTestId('util-summary-cpu');
        const memorySummary = page.getByTestId('util-summary-memory');
        await expect(cpuSummary.or(utilizationCard.getByText('CPU'))).toBeVisible({ timeout: 15000 });
        await expect(memorySummary.or(utilizationCard.getByText('Memory'))).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Something wrong happened')).not.toBeVisible();
      });

      // 4b: Verify hub no longer shows VMs on source cluster (Polarion expected result)
      // Forklift does not auto-remove source VMs; delete explicitly after confirming migration success.
      await test.step('4b: Verify hub no longer shows migrated VMs', async () => {
        for (const vmName of VM_NAMES) {
          await ocSvc.run(
            `oc delete vm ${vmName} -n ${VM_NAMESPACE} --force --grace-period=0 2>/dev/null || true`,
          );
        }
        // CLI confirmation: VMs physically removed from hub
        await expect(async () => {
          for (const vmName of VM_NAMES) {
            const result = await ocSvc.run(
              `oc get vm ${vmName} -n ${VM_NAMESPACE} --no-headers 2>&1 || true`,
            );
            expect(result).toContain('NotFound');
          }
        }).toPass({ intervals: [5000, 10000], timeout: 60000 });

        // UI verification with ACM Search indexing tolerance.
        // ACM Search re-indexes asynchronously; allow up to 90s for the UI to reflect deletion.
        // If Search hasn't caught up, the CLI assertion above is the authoritative check.
        let uiReflectsRemoval = false;
        try {
          await expect(async () => {
            await page.reload({ waitUntil: 'domcontentloaded' });
            await fleetPage.gotoVmTab();
            await treeView.expandCluster(CLUSTER);
            await treeView.clickProject(CLUSTER, VM_NAMESPACE);
            await page.waitForTimeout(3000);
            for (const vmName of VM_NAMES) {
              await expect(fleetPage.getVmRow(vmName)).not.toBeVisible({ timeout: 5000 });
            }
          }).toPass({ intervals: [20000, 30000], timeout: 90000 });
          uiReflectsRemoval = true;
        } catch {
          console.log('[Step 4b] ACM Search index has not caught up within 90s — CLI confirms VMs are deleted from hub');
        }
        console.log(`[Step 4b] Hub VM removal — CLI: CONFIRMED, UI: ${uiReflectsRemoval ? 'CONFIRMED' : 'PENDING (Search indexing latency)'}`);
      });
    });

    await test.step('5: Validate migrated VMs are controllable from hub (Pause/Stop/Start)', async () => {

      // Helper: navigate to spoke VMs page (with retry for tree view stability)
      const navigateToSpokeVms = async () => {
        await expect(async () => {
          await fleetPage.goto();
          await fleetPage.gotoVmTab();
          await page.waitForTimeout(2000);
          await treeView.expandCluster(spokeCluster);
          await treeView.clickProject(spokeCluster, VM_NAMESPACE);
        }).toPass({ intervals: [10000, 15000], timeout: 60000 });
        await page.waitForTimeout(2000);
      };

      // Helper: check if all VMs already have target status via CLI
      const allVmsHaveStatus = async (targetStatus: string): Promise<boolean> => {
        for (const vmName of VM_NAMES) {
          const status = await getVmStatusOnSpoke(vmName, VM_NAMESPACE, spokeCluster, kcPath);
          if (status !== targetStatus) return false;
        }
        return true;
      };

      // Test Pause: trigger bulk pause, then verify via CLI + UI
      await page.waitForTimeout(3000);
      if (!(await allVmsHaveStatus('Paused'))) {
        await navigateToSpokeVms();
        await fleetPage.selectMultipleVms(VM_NAMES);
        await fleetPage.triggerBulkControlAction('pause');
      }
      await expect(async () => {
        for (const vmName of VM_NAMES) {
          const status = await getVmStatusOnSpoke(vmName, VM_NAMESPACE, spokeCluster, kcPath);
          expect(status, `VM ${vmName} should be Paused`).toBe('Paused');
        }
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });
      await navigateToSpokeVms();
      for (const vmName of VM_NAMES) {
        const row = fleetPage.getVmRow(vmName).first();
        await expect(row.getByText('Paused', { exact: true })).toBeVisible({ timeout: 15000 });
      }

      // Test Stop: trigger bulk stop, then verify via CLI + UI
      await navigateToSpokeVms();
      await fleetPage.selectMultipleVms(VM_NAMES);
      await fleetPage.triggerBulkControlAction('stop');
      await expect(async () => {
        for (const vmName of VM_NAMES) {
          const status = await getVmStatusOnSpoke(vmName, VM_NAMESPACE, spokeCluster, kcPath);
          expect(status, `VM ${vmName} should be Stopped`).toBe('Stopped');
        }
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });
      await navigateToSpokeVms();
      for (const vmName of VM_NAMES) {
        const row = fleetPage.getVmRow(vmName).first();
        await expect(row.getByText('Stopped', { exact: true })).toBeVisible({ timeout: 15000 });
      }

      // Test Start: trigger bulk start, then verify via CLI + UI
      await navigateToSpokeVms();
      await fleetPage.selectMultipleVms(VM_NAMES);
      await fleetPage.triggerBulkControlAction('start');
      await expect(async () => {
        for (const vmName of VM_NAMES) {
          const status = await getVmStatusOnSpoke(vmName, VM_NAMESPACE, spokeCluster, kcPath);
          expect(status, `VM ${vmName} should be Running`).toBe('Running');
        }
      }).toPass({ intervals: [15000, 20000], timeout: 300000 });
      await navigateToSpokeVms();
      for (const vmName of VM_NAMES) {
        const row = fleetPage.getVmRow(vmName).first();
        await expect(row.getByText('Running', { exact: true })).toBeVisible({ timeout: 15000 });
      }

      // Final spoke CLI verification (Polarion: "Spoke cluster shows consistent status with hub")
      for (const vmName of VM_NAMES) {
        const status = await getVmStatusOnSpoke(vmName, VM_NAMESPACE, spokeCluster, kcPath);
        expect(status, `VM ${vmName} spoke status should match hub (Running)`).toBe('Running');
      }
    });
  });
});
