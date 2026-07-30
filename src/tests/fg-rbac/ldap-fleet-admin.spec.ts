/**
 * RHACM4K-60251: RBAC UI - Full Fleet Admin (LDAP)
 *
 * Polarion steps:
 *   1. Environment verification (LDAP user, roles, VM)
 *   2. Full Fleet Admin - Visibility & VM Actions (actions enabled)
 *   3. Create Capabilities & Extended Features (Create buttons visible)
 *   4. CLI Verification (full CRUD access)
 *
 * LDAP user: qe-admin-user via qe-ldap IDP
 * Roles: kubevirt.io:admin + acm-vm-fleet:admin + acm-vm-extended:admin
 * Prerequisites: GLAuth LDAP server deployed (scripts/ldap/install-glauth.sh)
 *
 * Login uses asUser fixture (pre-saved storageState).
 */

import { test, expect } from '@fixtures/fg-rbac-test';
import { OcCliService } from '@services/OcCliService';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { TreeView } from '@components/fleet-virt/TreeView';
import { FLEET_VIRT_DEFAULTS } from '@constants/fleet-virt';

const VM_NAME = `e2e-admin-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = 'local-cluster';
const LDAP_ADMIN_USER = 'fg-rbac-ldap-admin-60258';
const MCRA_NS = 'open-cluster-management-global-set';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Full Fleet Admin (LDAP)', { tag: ['@fg-rbac', '@fleet-virt'] }, () => {
  test.setTimeout(600000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(180000);

    const canGet = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-admin-user');
    if (!canGet) {
      for (const role of ['kubevirt.io:admin', 'acm-vm-fleet:admin', 'acm-vm-extended:admin']) {
        await ocSvc.mcraCreate({
          name: `ldap-admin-60251-${role.replace(/[:.]/g, '-')}-${Date.now()}`,
          namespace: MCRA_NS,
          subjectKind: 'User',
          subjectName: 'qe-admin-user',
          clusterRole: role,
          placementName: 'cluster-sets-default',
          placementNamespace: MCRA_NS,
          raName: `admin-${role.replace(/[:.]/g, '-')}`,
        });
      }
    }

    await expect(async () => {
      const ok = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-admin-user');
      expect(ok).toBe(true);
    }).toPass({ intervals: [10000, 15000], timeout: 60000 });

    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60251' });
    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60251: LDAP admin user has full Fleet Virt access', async ({ asUser, oc }) => {
    await test.step('1: Verify LDAP admin can access Fleet Virt with tree visible', async () => {
      const session = await asUser(LDAP_ADMIN_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const treeView = new TreeView(session.page);

      await fleetPage.goto();
      await expect(fleetPage.getPageHeading().first()).toBeVisible({ timeout: 30000 });

      await expect(async () => {
        await expect(treeView.getAllTreeItems().first()).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('2: VM actions enabled for admin user', async () => {
      const session = await asUser(LDAP_ADMIN_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const vmDetails = new VmDetailsPage(session.page);

      await expect(async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });

      await vmDetails.openActions();
      const actionsMenu = vmDetails.getActionsMenu();
      await expect(actionsMenu).toBeVisible({ timeout: 5000 });

      // Admin user on Running VM: at least one action must be enabled
      const enabledItem = actionsMenu.locator('[role="menuitem"]:not([aria-disabled="true"])');
      await expect(enabledItem.first()).toBeVisible({ timeout: 5000 });

      await session.page.keyboard.press('Escape');
    });

    await test.step('3: Create button visible and detail tabs load', async () => {
      const session = await asUser(LDAP_ADMIN_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const vmDetails = new VmDetailsPage(session.page);

      await fleetPage.goto();
      await fleetPage.gotoVmTab();

      await expect(fleetPage.getCreateVmButton()).toBeVisible({ timeout: 10000 });

      await expect(async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });

      await vmDetails.clickTab('Events');
      await expect(vmDetails.getEventsHeading()).toBeVisible({ timeout: 15000 });
    });

    await test.step('4: CLI verification -- full CRUD access', async () => {
      const canGetVMs = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-admin-user');
      expect(canGetVMs).toBe(true);

      const canCreateVMs = await ocSvc.rbacAuthCanI('create', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-admin-user');
      expect(canCreateVMs).toBe(true);

      const canDeleteVMs = await ocSvc.rbacAuthCanI('delete', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-admin-user');
      expect(canDeleteVMs).toBe(true);

      const canPatchVMs = await ocSvc.rbacAuthCanI('patch', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-admin-user');
      expect(canPatchVMs).toBe(true);
    });
  });
});
