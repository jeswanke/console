/**
 * RHACM4K-60309: Fleet Virtualization - Standard Roles Without Fleet Access
 *
 * Polarion steps:
 *   1. std-view: no fleet tree, no Search results for VMs
 *   2. std-admin: same -- no fleet data, no Search results
 *   3. CLI: edit lacks deletecollection, admin has it
 *
 * Validates that users with standard kubevirt.io roles but NO acm-vm-fleet roles
 * cannot see Fleet Virtualization VM data or find VMs via ACM Search.
 *
 * Login uses asUser fixture (pre-saved storageState).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { SearchPage } from '@pages/search/SearchPage';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const STD_VIEW_USER = 'fg-rbac-std-view-60309';
const STD_ADMIN_USER = 'fg-rbac-std-admin-60309';
const STD_VIEW_USERNAME = 'clc-e2e-std-view-60309';
const STD_ADMIN_USERNAME = 'clc-e2e-std-admin-60309';
const STD_EDIT_USERNAME = 'clc-e2e-std-edit-60309';
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;

test.describe('Fleet Virt - Standard Roles Without Fleet Access', { tag: ['@fg-rbac', '@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(300000);

  test('RHACM4K-60309: Standard role users cannot see Fleet Virt VMs', async ({ asUser, oc }) => {
    await test.step('1: std-view -- Fleet Virt empty + Search returns no VMs', async () => {
      const session = await asUser(STD_VIEW_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);

      await fleetPage.goto();
      const heading = fleetPage.getPageHeading();
      const headingVisible = await heading.isVisible({ timeout: 30000 }).catch(() => false);

      if (headingVisible) {
        const vmRows = fleetPage.getVmTableRows();
        const hasRows = await vmRows.first().isVisible({ timeout: 10000 }).catch(() => false);
        if (hasRows) {
          expect(await vmRows.count()).toBe(0);
        }
      }

      const searchPage = new SearchPage(session.page, oc);
      await searchPage.goto();
      await searchPage.filterByKind('VirtualMachine');
      const hasVmResults = await searchPage.table.getRow('VirtualMachine').isVisible({ timeout: 10000 }).catch(() => false);
      expect(hasVmResults).toBe(false);
    });

    await test.step('2: std-admin -- Fleet Virt empty + Search returns no VMs', async () => {
      const session = await asUser(STD_ADMIN_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);

      await fleetPage.goto();
      const heading = fleetPage.getPageHeading();
      const headingVisible = await heading.isVisible({ timeout: 30000 }).catch(() => false);

      if (headingVisible) {
        const vmRows = fleetPage.getVmTableRows();
        const hasRows = await vmRows.first().isVisible({ timeout: 10000 }).catch(() => false);
        if (hasRows) {
          expect(await vmRows.count()).toBe(0);
        }
      }

      const searchPage = new SearchPage(session.page, oc);
      await searchPage.goto();
      await searchPage.filterByKind('VirtualMachine');
      const hasVmResults = await searchPage.table.getRow('VirtualMachine').isVisible({ timeout: 10000 }).catch(() => false);
      expect(hasVmResults).toBe(false);
    });

    await test.step('3: CLI -- verify fleet permissions + deletecollection difference', async () => {
      const viewCanList = await oc.rbacAuthCanI('list', 'managedclusterviews', VM_NAMESPACE, STD_VIEW_USERNAME);
      const adminCanList = await oc.rbacAuthCanI('list', 'managedclusterviews', VM_NAMESPACE, STD_ADMIN_USERNAME);

      expect(viewCanList).toBe(false);
      expect(adminCanList).toBe(false);

      const editCanDeleteCollection = await oc.rbacAuthCanI(
        'deletecollection', 'virtualmachines.kubevirt.io', VM_NAMESPACE, STD_EDIT_USERNAME
      );
      const adminCanDeleteCollection = await oc.rbacAuthCanI(
        'deletecollection', 'virtualmachines.kubevirt.io', VM_NAMESPACE, STD_ADMIN_USERNAME
      );

      expect(editCanDeleteCollection).toBe(false);
      expect(adminCanDeleteCollection).toBe(true);
    });
  });
});
