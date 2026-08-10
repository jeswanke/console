/**
 * RHACM4K-59217: Single VM Live Migration
 *
 * Polarion steps:
 *   1. Log into ACM hub
 *   2. Create Test VM on source cluster (hub)
 *   3. Verify UI dashboard for the VM
 *   4. Trigger cross-cluster migration (Actions → Cross-cluster migration)
 *   5. Verify VM on destination cluster (spoke)
 *
 * Prerequisites:
 *   - CNV installed on hub AND spoke
 *   - MTV operator v2.10.0+ on hub (openshift-mtv)
 *   - CCLM feature gates: decentralizedLiveMigration=true (HyperConverged)
 *   - Submariner or L2 network connectivity between clusters
 *   - Search collector enabled on spoke
 *
 * Login via storageState (auth.setup.ts).
 */

import path from 'path';

import { test, expect } from '@fixtures/fg-rbac-test';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { CclmWizardPage } from '@pages/fleet-virt/CclmWizardPage';
import { TreeView } from '@components/fleet-virt/TreeView';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';
import {
  ensureVmWithPvcReady,
  cleanupCclmResources,
  checkCclmPrerequisites,
  getForkliftPlans,
  getForkliftPlanStatus,
  getVmStatusOnSpoke,
} from '@lib/fg-rbac/vm-test-setup';

const VM_NAME = `e2e-migrate-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = FLEET_VIRT_DEFAULTS.hubCluster;

test.describe('FG-RBAC - VM Live Migration', { tag: ['@fg-rbac', '@fleet-virt', '@cclm'] }, () => {
  test.setTimeout(1800000);

  let spokeCluster = '';
  let mtvAvailable = false;

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(300000);
    spokeCluster = FLEET_VIRT_DEFAULTS.spokeCluster;
    console.log(`[CCLM Debug] spokeCluster=${spokeCluster}, VIRT_SPOKE_CLUSTER=${process.env.VIRT_SPOKE_CLUSTER}`);

    mtvAvailable = await checkCclmPrerequisites(spokeCluster);
    console.log(`[CCLM Debug] mtvAvailable=${mtvAvailable}`);

    if (mtvAvailable) {
      await ensureVmWithPvcReady(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-59217' });
    }
  });

  test.afterAll(async () => {
    if (mtvAvailable) {
      await cleanupCclmResources(VM_NAME, VM_NAMESPACE, spokeCluster);
    }
  });

  test('RHACM4K-59217: Single VM live migration from hub to spoke', async ({ page, oc }) => {
    test.skip(!mtvAvailable, 'CCLM prerequisites not met -- requires MTV on hub + CNV on spoke');
    test.skip(!spokeCluster, 'VIRT_SPOKE_CLUSTER not set');

    const fleetPage = new FleetVirtPage(page, oc);
    const vmDetails = new VmDetailsPage(page);
    const cclmWizard = new CclmWizardPage(page);
    const treeView = new TreeView(page);

    await test.step('1: Navigate to Fleet Virtualization', async () => {
      await fleetPage.goto();
      await expect(fleetPage.getPageHeading().first()).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Verify test VM is visible and running in tree view', async () => {
      await expect(async () => {
        await fleetPage.goto();
        await fleetPage.gotoVmTab();
        await expect(treeView.getAllTreeItems().first()).toBeVisible({ timeout: 15000 });
        await treeView.expandCluster(CLUSTER);
        await treeView.clickProject(CLUSTER, VM_NAMESPACE);
        const vmRow = fleetPage.getVmRow(VM_NAME).first();
        await expect(vmRow).toBeVisible({ timeout: 15000 });
        await expect(vmRow.getByText('Running', { exact: true })).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [15000, 30000], timeout: 120000 });
    });

    await test.step('3: Verify VM dashboard tabs and LiveMigratable status', async () => {
      // Navigate to VM details
      await expect(async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 60000 });

      // Overview: metrics/pod/node info
      await vmDetails.clickTab('Overview');
      await expect(vmDetails.getMetricsChart().first()).toBeVisible({ timeout: 15000 });

      // Console: VNC connects
      await expect(async () => {
        await vmDetails.clickTab('Console');
        await expect(vmDetails.getVncConsoleDropdown()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });

      // Events: shows VM lifecycle events
      await vmDetails.clickTab('Events');
      await expect(vmDetails.getEventsHeading()).toBeVisible({ timeout: 15000 });

      // YAML: shows VM spec
      await vmDetails.clickTab('YAML');
      await expect(vmDetails.getYamlEditor()).toBeVisible({ timeout: 15000 });

      // Diagnostics: LiveMigratable=Healthy (Polarion prerequisite for CCLM)
      await vmDetails.getTabLink('Diagnostics').click();
      await expect(
        page.getByText('LiveMigratable').first(),
      ).toBeVisible({ timeout: 30000 });
      await expect(
        page.locator('tr', { has: page.getByText('LiveMigratable') }).getByText('Healthy').first(),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step('4: Trigger cross-cluster migration', async () => {
      await expect(async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 60000 });

      // Open Actions → Migration → Cross cluster migration
      await page.keyboard.press('Escape');
      await vmDetails.openMigrationMenu();
      await vmDetails.getCrossClusterMigrationItem().click();

      // Wait for migration wizard dialog
      await cclmWizard.waitForVisible();
      await expect(cclmWizard.getTitle()).toBeVisible({ timeout: 10000 });

      // Select target cluster and project
      await cclmWizard.selectTargetCluster(spokeCluster);
      await expect(cclmWizard.getTargetClusterText(spokeCluster)).toBeVisible({ timeout: 10000 });
      await cclmWizard.selectProject(VM_NAMESPACE);

      // Proceed through wizard
      await cclmWizard.clickNext();

      // Check readiness before clicking Migrate
      await expect(cclmWizard.getReadyHeading()).toBeVisible({ timeout: 30000 });

      // Verify no errors in the wizard before proceeding
      expect(await cclmWizard.getErrorAlert().count()).toBe(0);

      await cclmWizard.clickMigrate();

      // Wait for success notification inside the wizard dialog
      await expect(cclmWizard.getSuccessMessage()).toBeVisible({ timeout: 60000 });
      await expect(cclmWizard.getSuccessDescription()).toBeVisible({ timeout: 10000 });

      // Close the wizard dialog
      await cclmWizard.close();
    });

    await test.step('5: Verify VM reaches Running on destination cluster (spoke)', async () => {
      const kcPath = path.resolve(__dirname, '../../../.auth/MC_MERGED_kubeconfig');

      // Verify the Forklift Plan was created
      const initialPlans = await getForkliftPlans();
      console.log(`Initial Plans (all namespaces): ${initialPlans.trim()}`);

      // Wait for VM to reach Running on spoke (full CCLM completion)
      await expect(async () => {
        const planStatus = await getForkliftPlanStatus('mtv-integrations');
        const status = await getVmStatusOnSpoke(VM_NAME, VM_NAMESPACE, spokeCluster, kcPath);
        console.log(`[Step 5] Plan: ${planStatus.trim()} | VM on spoke: ${status}`);
        expect(status, 'VM must reach Running on spoke').toBe('Running');
      }).toPass({ intervals: [30000, 45000, 60000], timeout: 900000 });

      // Navigate to VM on spoke via tree view and verify Running in UI
      await expect(async () => {
        await fleetPage.goto();
        await fleetPage.gotoVmTab();
        await expect(treeView.getAllTreeItems().first()).toBeVisible({ timeout: 15000 });
        await treeView.expandCluster(spokeCluster);
        await treeView.clickProject(spokeCluster, VM_NAMESPACE);
        const vmRow = fleetPage.getVmRow(VM_NAME).first();
        await expect(vmRow).toBeVisible({ timeout: 15000 });
        await expect(vmRow.getByText('Running', { exact: true })).toBeVisible({ timeout: 10000 });
      }).toPass({ intervals: [30000, 60000], timeout: 300000 });

      // Navigate to VM details on spoke and verify dashboard loads
      await expect(async () => {
        await fleetPage.gotoVmDetails(spokeCluster, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [15000, 30000], timeout: 120000 });
    });
  });
});
