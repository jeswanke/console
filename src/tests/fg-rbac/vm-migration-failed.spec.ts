/**
 * RHACM4K-59220: Failed Migration & Recovery (User-Facing Error Handling)
 *
 * Polarion steps:
 *   1. Log into spoke and apply ResourceQuota to block migration
 *   2. Configure failure scenario on destination (ResourceQuota with low limits)
 *   3. Trigger migration from Fleet Virtualization UI
 *   4. Verify error display (WaitingForReceiver / scheduling error)
 *   5. Verify VM remains safe on source (Running on local-cluster)
 *   6. Remove ResourceQuota (cleanup)
 *
 * Prerequisites:
 *   - ACM 2.15+ with CCLM
 *   - CNV on hub + spoke
 *   - MTV operator on hub
 *   - CLI access to spoke for ResourceQuota manipulation
 *
 * Login via storageState (auth.setup.ts).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { CclmWizardPage } from '@pages/fleet-virt/CclmWizardPage';
import { TreeView } from '@components/fleet-virt/TreeView';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';
import {
  ensureVmWithPvcReady,
  cleanupCclmResources,
  cleanupOrphanedVmims,
  checkCclmPrerequisites,
  applySpokeResourceQuota,
  deleteSpokeResourceQuota,
} from '@lib/fg-rbac/vm-test-setup';

const VM_NAME = `e2e-quota-fail-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = FLEET_VIRT_DEFAULTS.hubCluster;

test.describe(
  'FG-RBAC - Failed Migration & Recovery',
  { tag: ['@fg-rbac', '@fleet-virt', '@cclm'] },
  () => {
    test.setTimeout(600000);

    let spokeCluster = '';
    let mtvAvailable = false;

    test.beforeAll(async ({}, testInfo) => {
      testInfo.setTimeout(300000);
      spokeCluster = FLEET_VIRT_DEFAULTS.spokeCluster;
      mtvAvailable = await checkCclmPrerequisites(spokeCluster);

      if (mtvAvailable) {
        await cleanupOrphanedVmims(VM_NAMESPACE, spokeCluster);
        await ensureVmWithPvcReady(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-59220' });
      }
    });

    test.afterAll(async () => {
      await deleteSpokeResourceQuota(VM_NAMESPACE, spokeCluster);
      if (mtvAvailable) {
        await cleanupCclmResources(VM_NAME, VM_NAMESPACE, spokeCluster);
      }
    });

    test('RHACM4K-59220: Migration failure with ResourceQuota — VM remains on source', async ({
      page,
      oc,
    }) => {
      test.skip(!mtvAvailable, 'CCLM prerequisites not met -- requires MTV on hub + CNV on spoke');
      test.skip(spokeCluster === 'local-cluster', 'VIRT_SPOKE_CLUSTER not set');

      const fleetPage = new FleetVirtPage(page, oc);
      const vmDetails = new VmDetailsPage(page);
      const cclmWizard = new CclmWizardPage(page);
      const treeView = new TreeView(page);

      await test.step('1: Navigate to VM and verify it is Running', async () => {
        await fleetPage.goto();
        await expect(async () => {
          await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
          await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
        }).toPass({ intervals: [10000, 15000], timeout: 120000 });
      });

      await test.step('2: Apply ResourceQuota on spoke to block VM scheduling', async () => {
        await applySpokeResourceQuota(VM_NAMESPACE, spokeCluster);

        const exists = await oc.resourceQuotaExists('mtv-migration-deny', VM_NAMESPACE, {
          context: spokeCluster,
        });
        expect(exists).toBeTruthy();
      });

      await test.step('3: Trigger cross-cluster migration', async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
        await page.keyboard.press('Escape');
        await vmDetails.openMigrationMenu();
        await vmDetails.getCrossClusterMigrationItem().click();

        await cclmWizard.waitForVisible();
        await cclmWizard.selectTargetCluster(spokeCluster);
        await cclmWizard.selectProject(VM_NAMESPACE);
        await cclmWizard.clickNext();
        await cclmWizard.clickMigrate();
        await expect(cclmWizard.getSuccessMessage()).toBeVisible({ timeout: 60000 });
        await cclmWizard.close();
      });

      await test.step('4: Verify error display — migration stalls on spoke', async () => {
        // Polarion: Check the VM on the SPOKE cluster (destination) where migration is blocked.
        // Expected states:
        //   - With Submariner (live migration): "WaitingForReceiver" (pod can't be scheduled)
        //   - Without Submariner (cold migration): "Provisioning" (disk transfer stalled)
        // Both indicate the migration failed due to ResourceQuota constraints.

        // Wait for VM to appear on spoke via tree view
        await expect(async () => {
          await fleetPage.goto();
          await fleetPage.gotoVmTab();
          await treeView.expandCluster(spokeCluster);
          await treeView.clickProject(spokeCluster, VM_NAMESPACE);
          const vmRow = fleetPage.getVmRow(VM_NAME).first();
          await expect(vmRow).toBeVisible({ timeout: 15000 });
        }).toPass({ intervals: [20000, 30000], timeout: 180000 });

        // Navigate to VM details on spoke and verify it is NOT Running (migration stuck/failed)
        await fleetPage.gotoVmDetails(spokeCluster, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 30000 });
        const statusLabel = vmDetails.getStatusLabel();
        await expect(statusLabel).toBeVisible({ timeout: 10000 });

        // Verify the status indicates failure: WaitingForReceiver, Provisioning, or Scheduling
        const statusText = await statusLabel.textContent();
        console.log(`Spoke VM status: "${statusText?.trim()}"`);
        expect(
          statusText,
          'VM on spoke should be stuck (not Running) — migration blocked by ResourceQuota'
        ).toMatch(/WaitingForReceiver|Provisioning|Scheduling|Pending/i);
        expect(statusText).not.toMatch(/^.*Running$/);

        // Check Diagnostics tab for scheduling/migration error details.
        // Diagnostics tab exists when VMI is created (WaitingForReceiver state).
        // In Provisioning state (no VMI), the tab won't be present — verified by status above.
        if (statusText?.match(/WaitingForReceiver/i)) {
          const diagnosticsTab = vmDetails.getTabLink('Diagnostics');
          await expect(diagnosticsTab).toBeVisible({ timeout: 10000 });
          await diagnosticsTab.click();
          const diagnosticsContent = vmDetails.getDiagnosticsContent(
            /not yet been scheduled|virt-launcher pod|scheduling/i
          );
          await expect(diagnosticsContent.first()).toBeVisible({ timeout: 15000 });
          console.log('Diagnostics message confirms: virt-launcher pod scheduling blocked');
        } else {
          console.log(
            `Diagnostics tab not applicable (VM status: ${statusText?.trim()} — no VMI, hence no Diagnostics)`
          );
        }
      });

      await test.step('5: Verify VM remains safe on source cluster', async () => {
        // Polarion: "Verify Cluster column still shows local-cluster (not spoke)"
        // Polarion: "Verify Status shows Running (not affected by failed migration)"
        await expect(async () => {
          await fleetPage.goto();
          await fleetPage.gotoVmTab();
          await expect(fleetPage.getTreeViewContainer()).toBeVisible({ timeout: 10000 });
          await treeView.expandCluster(CLUSTER);
          await treeView.clickProject(CLUSTER, VM_NAMESPACE);
          const vmRow = fleetPage.getVmRow(VM_NAME).first();
          await expect(vmRow).toBeVisible({ timeout: 15000 });
          await expect(vmRow.getByText('Running')).toBeVisible({ timeout: 5000 });
        }).toPass({ intervals: [15000, 20000], timeout: 120000 });

        // Also verify via CLI that VM is still Running on source
        await expect(async () => {
          const running = await oc.vmIsRunning(VM_NAME, VM_NAMESPACE);
          expect(running).toBeTruthy();
        }).toPass({ intervals: [10000, 15000], timeout: 60000 });
      });

      await test.step('6: Remove ResourceQuota (cleanup)', async () => {
        await deleteSpokeResourceQuota(VM_NAMESPACE, spokeCluster);

        const exists = await oc.resourceQuotaExists('mtv-migration-deny', VM_NAMESPACE, {
          context: spokeCluster,
        });
        expect(exists).toBeFalsy();
      });
    });
  }
);
