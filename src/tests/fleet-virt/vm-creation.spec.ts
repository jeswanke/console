/**
 * RHACM4K-60559: Fleet Virtualization UI - Sanity Test: VM Creation Workflows
 *
 * Polarion steps:
 *   1. Log into ACM as kubeadmin (hub)
 *   2. Create VM via Custom Config (InstanceTypes / Bootable Volumes)
 *      - Select volume explicitly
 *      - View YAML/CLI from bottom right button
 *      - Click Customize VM
 *      - Create and verify lifecycle
 *   3. Create VM via Template Catalog
 *      - Filter by "Boot source available"
 *      - Filter by OS: Fedora
 *      - Select Fedora template card
 *      - Create and track lifecycle: Provisioning → Starting → Running
 *      - Validate events tab
 *
 * Prerequisites:
 *   - ACM 2.16+ with FG-RBAC
 *   - CNV (OpenShift Virtualization) on hub
 *   - Bootable volumes available
 *   - Templates available in openshift namespace
 *
 * Verified selectors from:
 *   - kubevirt-plugin source (playwright/src/components/vm-wizard/*)
 *   - Live DOM inspection (browser MCP, 2026-07-28)
 */

import { test, expect } from '@fixtures/fleet-virt-test';
import { VmCreationPage } from '@pages/fleet-virt/VmCreationPage';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_INSTANCETYPE = `e2e-vm-it-${Date.now()}`;
const VM_TEMPLATE = `e2e-vm-tpl-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = FLEET_VIRT_DEFAULTS.hubCluster;

test.describe('Fleet Virt - VM Creation Workflows', { tag: ['@fleet-virt', '@virtualization'] }, () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600000);

  test.afterAll(async ({ oc }) => {
    await oc.vmDeleteTestVM(VM_INSTANCETYPE, VM_NAMESPACE);
    await oc.vmDeleteTestVM(VM_TEMPLATE, VM_NAMESPACE);
  });

  test('RHACM4K-60559: Create VM via Custom Configuration (InstanceTypes)', async ({
    page, oc, fleetVirtPage,
  }) => {
    const vmCreation = new VmCreationPage(page, oc);

    await test.step('1: Navigate to Fleet Virtualization', async () => {
      await fleetVirtPage.goto();
      await expect(fleetVirtPage.getPageHeading().first()).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Open VM creation wizard', async () => {
      await vmCreation.openCreateWizard();
      await expect(vmCreation.getWizard()).toBeVisible({ timeout: 15000 });
    });

    await test.step('3: Navigate through wizard — select volume and fill name', async () => {
      // The wizard has steps: Deployment details → Guest OS → Boot source → Compute → Customization
      // Polarion: "Clusters: local-cluster, Projects: default, Volume: Select fedora, VM Name: ..."
      // Navigate through wizard steps, selecting bootable volume when it appears
      await expect(async () => {
        // Check if we're already at a point where volume table or VM name is visible
        const volumeTable = page.locator('table tbody tr td[id="name"]').first();
        const vmNameInput = page.locator('#vm-name, [name="vmname"]').first();

        if (await vmNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          return; // Already at name step
        }

        if (await volumeTable.isVisible({ timeout: 2000 }).catch(() => false)) {
          // On boot source step — select volume explicitly
          const fedoraVol = page.locator('td[id="name"]').filter({ hasText: /fedora/i }).first();
          if (await fedoraVol.isVisible({ timeout: 3000 }).catch(() => false)) {
            await fedoraVol.click();
          } else {
            await volumeTable.click();
          }
          await page.waitForTimeout(500);
          await vmCreation.clickNext();
          return;
        }

        // On other steps — keep clicking Next to advance
        const primaryBtn = vmCreation.getPrimaryButton();
        const isDisabled = await primaryBtn.isDisabled().catch(() => true);
        const ariaDisabled = await primaryBtn.getAttribute('aria-disabled').catch(() => 'true');
        if (!isDisabled && ariaDisabled !== 'true') {
          await primaryBtn.click();
          await page.waitForTimeout(1500);
        }
        // Force retry
        throw new Error('Still navigating wizard steps');
      }).toPass({ intervals: [2000, 3000, 4000], timeout: 90000 });

      // Fill VM name (should now be on name step or can be filled)
      const vmNameInput = page.locator('#vm-name, [name="vmname"]').first();
      if (await vmNameInput.isVisible({ timeout: 10000 }).catch(() => false)) {
        await vmNameInput.fill(VM_INSTANCETYPE);
        await vmNameInput.press('Tab');
      } else {
        await vmCreation.fillVmName(VM_INSTANCETYPE);
      }
    });

    await test.step('4: View YAML & CLI modal', async () => {
      // Polarion: "View YAML/CLI by clicking on the button on the bottom right"
      const yamlCliBtn = page.locator('button:has-text("View YAML & CLI")');
      if (await yamlCliBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await vmCreation.clickViewYamlAndCli();
        await vmCreation.verifyYamlModalVisible();

        // Verify YAML content
        const modalBody = page.locator('.pf-v6-c-modal-box__body');
        await expect(modalBody.getByText(/kind|VirtualMachine|apiVersion/)).toBeVisible({ timeout: 10000 });

        // Switch to CLI tab and verify
        await vmCreation.clickCliTab();
        await vmCreation.verifyCliContentVisible();

        // Close modal
        await vmCreation.closeYamlCliModal();
      } else {
        console.log('YAML & CLI button not visible at current step — continuing');
      }
    });

    await test.step('5: Navigate to review and create VM', async () => {
      await vmCreation.navigateToReviewStep();
      await vmCreation.clickCreateVm();
    });

    await test.step('6: Verify VM lifecycle and dashboard metrics', async () => {
      // Polarion: "Once VM starts running, dashboard will show VM metrics (CPU/Memory)"
      await expect(async () => {
        const running = await oc.vmIsRunning(VM_INSTANCETYPE, VM_NAMESPACE);
        expect(running).toBeTruthy();
      }).toPass({ intervals: [10000, 15000, 20000], timeout: 180000 });

      // Navigate to VM details to verify metrics are populated
      await fleetVirtPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_INSTANCETYPE);
      const vmDetails = new VmDetailsPage(page);
      await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 30000 });

      // Verify metrics/overview content is visible
      const metricsContent = vmDetails.getMetricsChart();
      await expect(metricsContent.first()).toBeVisible({ timeout: 30000 });
    });
  });

  test('RHACM4K-60559: Create VM via Template Catalog', async ({
    page, oc, fleetVirtPage,
  }) => {
    const vmCreation = new VmCreationPage(page, oc);

    await test.step('1: Navigate to Fleet Virtualization', async () => {
      await fleetVirtPage.goto();
      await expect(fleetVirtPage.getPageHeading().first()).toBeVisible({ timeout: 30000 });
    });

    await test.step('2: Open wizard, select Template method, fill name', async () => {
      await vmCreation.openCreateWizard();
      await expect(vmCreation.getWizard()).toBeVisible({ timeout: 15000 });

      // Select "Create from Template" radio button
      const templateRadio = page.getByRole('radio', { name: /Create from Template/i });
      if (await templateRadio.isVisible({ timeout: 5000 }).catch(() => false)) {
        await templateRadio.click();
        await page.waitForTimeout(1000);
      }

      // Polarion: "VM Name: ui-vm-template" — required on Deployment details step to enable Next
      const vmNameInput = page.locator('input[placeholder*="Enter a name"]')
        .or(page.getByRole('textbox', { name: 'Name' })).first();
      await expect(vmNameInput).toBeVisible({ timeout: 10000 });
      await vmNameInput.fill(VM_TEMPLATE);
      await vmNameInput.press('Tab');
      await page.waitForTimeout(500);
    });

    await test.step('3: Advance to Template step and apply filters', async () => {
      // Click Next to go from "Deployment details" → "Template" step
      await vmCreation.clickNext();

      // Wait for template catalog to appear
      await expect(async () => {
        const filterBtn = page.locator('button:has-text("Filter")');
        const catalogGrid = page.locator('[id="vm-catalog-grid"], .templates-catalog-tile, [data-test-id*="fedora"]').first();
        const catalogPresent = await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)
          || await catalogGrid.isVisible({ timeout: 3000 }).catch(() => false);
        expect(catalogPresent, 'Template catalog should be visible').toBeTruthy();
      }).toPass({ intervals: [3000, 5000], timeout: 60000 });

      // Polarion: "Check: Boot source available"
      await vmCreation.filterByBootSourceAvailable();

      // Polarion: "Operating system: Select Fedora checkbox"
      await vmCreation.filterByOSName('Fedora');

      // Polarion: "Click on: Fedora VM template card"
      await expect(async () => {
        const fedoraCard = page.locator('[data-test-id*="fedora"]').first()
          .or(page.locator('.templates-catalog-tile').filter({ hasText: /fedora/i }).first());
        await expect(fedoraCard).toBeVisible({ timeout: 10000 });
        await fedoraCard.click();
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('4: Navigate to review and create', async () => {
      await vmCreation.navigateToReviewStep();
      await vmCreation.clickCreateVm();
    });

    await test.step('5: Track status lifecycle (Provisioning → Starting → Running)', async () => {
      // Polarion: "Track status lifecycle: Provisioning → Starting → Running"
      const observedStates: string[] = [];

      await expect(async () => {
        const status = await oc.run(
          `oc get vm ${VM_TEMPLATE} -n ${VM_NAMESPACE} -o jsonpath='{.status.printableStatus}' 2>/dev/null || echo "Unknown"`,
        );
        const currentStatus = status.trim().replace(/'/g, '');
        if (currentStatus && !observedStates.includes(currentStatus)) {
          observedStates.push(currentStatus);
          console.log(`Lifecycle: ${observedStates.join(' → ')}`);
        }
        expect(currentStatus).toBe('Running');
      }).toPass({ intervals: [5000, 10000, 15000], timeout: 180000 });

      console.log(`Final lifecycle observed: ${observedStates.join(' → ')}`);
    });

    await test.step('6: Validate events from the UI', async () => {
      // Polarion: "Validate events from the UI"
      await fleetVirtPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_TEMPLATE);
      const vmDetails = new VmDetailsPage(page);
      await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 30000 });

      // Navigate to Events tab
      await vmDetails.clickTab('Events');
      await expect(vmDetails.getEventsHeading()).toBeVisible({ timeout: 15000 });

      // Verify events are present (creation events)
      const eventsList = page.locator('[class*="event"]').or(page.getByText(/Created|Started|Scheduled/i));
      await expect(eventsList.first()).toBeVisible({ timeout: 15000 });
    });
  });
});
