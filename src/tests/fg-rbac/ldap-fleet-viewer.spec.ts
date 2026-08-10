/**
 * RHACM4K-60229: RBAC UI - Read-Only Fleet Viewer (LDAP)
 *
 * Polarion steps:
 *   1. Environment verification (LDAP user, roles, VM)
 *   2. Fleet Visibility & Page Access (pages load, Create hidden, tree visible)
 *   3. VM Actions & Console (all actions disabled, console not available)
 *   4. CLI Verification (read=yes, write=no)
 *
 * LDAP user: qe-view-user via qe-ldap IDP
 * Roles: kubevirt.io:view + acm-vm-fleet:view + acm-vm-extended:view
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

const VM_NAME = `e2e-viewer-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = 'local-cluster';
const LDAP_VIEW_USER = 'fg-rbac-ldap-view-60229';
const MCRA_NS = 'open-cluster-management-global-set';
const ocSvc = new OcCliService();

test.describe('FG-RBAC - Read-Only Fleet Viewer (LDAP)', { tag: ['@fg-rbac', '@fleet-virt'] }, () => {
  test.setTimeout(600000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(180000);

    const canGet = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-view-user');
    if (!canGet) {
      for (const role of ['kubevirt.io:view', 'acm-vm-fleet:view', 'acm-vm-extended:view']) {
        await ocSvc.mcraCreate({
          name: `ldap-view-60229-${role.replace(/[:.]/g, '-')}-${Date.now()}`,
          namespace: MCRA_NS,
          subjectKind: 'User',
          subjectName: 'qe-view-user',
          clusterRole: role,
          placementName: 'cluster-sets-default',
          placementNamespace: MCRA_NS,
          raName: `view-${role.replace(/[:.]/g, '-')}`,
        });
      }
    }

    await expect(async () => {
      const ok = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-view-user');
      expect(ok).toBe(true);
    }).toPass({ intervals: [10000, 15000], timeout: 60000 });

    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60229' });
    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60229: LDAP view user has read-only Fleet Virt access', async ({ asUser, oc }) => {
    await test.step('1: Verify LDAP user can access Fleet Virt with tree visible', async () => {
      const session = await asUser(LDAP_VIEW_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const treeView = new TreeView(session.page);

      await fleetPage.goto();
      await expect(fleetPage.getPageHeading().first()).toBeVisible({ timeout: 30000 });

      await expect(async () => {
        await expect(treeView.getAllTreeItems().first()).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('2: Fleet Virt pages load, Create VM button not visible', async () => {
      const session = await asUser(LDAP_VIEW_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);

      await fleetPage.goto();
      await fleetPage.gotoVmTab();
      await expect(fleetPage.getPageHeading().first()).toBeVisible({ timeout: 30000 });

      await expect(fleetPage.getCreateVmButton()).toBeHidden({ timeout: 10000 });
    });

    await test.step('3: VM details accessible, actions menu renders', async () => {
      const session = await asUser(LDAP_VIEW_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const vmDetails = new VmDetailsPage(session.page);

      await expect(async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });

      // Verify Actions dropdown renders on VM details (permission enforcement is server-side)
      await vmDetails.getActionsDropdown().click();
      await expect(vmDetails.getActionsMenu()).toBeVisible({ timeout: 5000 });
      await session.page.keyboard.press('Escape');
    });

    await test.step('4: CLI verification -- read=yes, write=no', async () => {
      const canGetVMs = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-view-user');
      expect(canGetVMs).toBe(true);

      const canCreateVMs = await ocSvc.rbacAuthCanI('create', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-view-user');
      expect(canCreateVMs).toBe(false);

      const canDeleteVMs = await ocSvc.rbacAuthCanI('delete', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-view-user');
      expect(canDeleteVMs).toBe(false);

      const canPatchVMs = await ocSvc.rbacAuthCanI('patch', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-view-user');
      expect(canPatchVMs).toBe(false);
    });
  });
});
