/**
 * RHACM4K-60258: Fleet Virtualization - IDP Comparison
 *
 * Polarion steps:
 *   1. Verify both IDP users can access Fleet Virt with tree visible
 *   2. HTPasswd user (clc-e2e-idp-kubevirt-60257) stops the VM via UI
 *   3. LDAP user (qe-admin-user) sees Stopped, starts the VM via UI
 *
 * HTPasswd user: clc-e2e-idp-kubevirt-60257 via clc-e2e-htpasswd IDP
 * LDAP user: qe-admin-user via qe-ldap IDP
 * Both have acm-vm-fleet:view + kubevirt.io:admin.
 * Proves RBAC is IDP-agnostic across different identity providers.
 *
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

const VM_NAME = `e2e-idp-cmp-${Date.now()}`;
const VM_NAMESPACE = FLEET_VIRT_DEFAULTS.vmNamespace;
const CLUSTER = 'local-cluster';
const HTPASSWD_USER = 'fg-rbac-idp-kubevirt-60257';
const LDAP_USER = 'fg-rbac-ldap-admin-60258';
const MCRA_NS = 'open-cluster-management-global-set';
const ocSvc = new OcCliService();

test.describe('Fleet Virt - IDP Comparison', { tag: ['@fg-rbac', '@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(600000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(180000);

    const htpasswdCanGet = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-idp-kubevirt-60257');
    if (!htpasswdCanGet) {
      await ocSvc.mcraAddRoleAssignment(
        'htpasswd-idp-kubevirt-assignment',
        'open-cluster-management-global-set',
        'kubevirt.io:admin',
        'rbac-hub-placement',
        'open-cluster-management-global-set',
        'kubevirt-admin-access',
        ['default']
      );
    }

    const ldapCanGet = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-admin-user');
    if (!ldapCanGet) {
      await ocSvc.mcraCreate({
        name: 'ldap-admin-idp-60258',
        namespace: MCRA_NS,
        subjectKind: 'User',
        subjectName: 'qe-admin-user',
        clusterRole: 'kubevirt.io:admin',
        placementName: 'cluster-sets-default',
        placementNamespace: MCRA_NS,
        raName: 'ldap-kubevirt-admin',
      });
      await ocSvc.mcraCreate({
        name: 'ldap-fleet-idp-60258',
        namespace: MCRA_NS,
        subjectKind: 'User',
        subjectName: 'qe-admin-user',
        clusterRole: 'acm-vm-fleet:view',
        placementName: 'cluster-sets-default',
        placementNamespace: MCRA_NS,
        raName: 'ldap-fleet-view',
      });
    }

    await expect(async () => {
      const htCanGet = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-idp-kubevirt-60257');
      const ldCanGet = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'qe-admin-user');
      expect(htCanGet).toBe(true);
      expect(ldCanGet).toBe(true);
    }).toPass({ intervals: [10000, 15000], timeout: 60000 });

    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60258' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60258: HTPasswd and LDAP users access Fleet Virt equally', async ({ asUser, oc }) => {
    await test.step('1: Login as HTPasswd user and verify Fleet Virt access', async () => {
      const session = await asUser(HTPASSWD_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const treeView = new TreeView(session.page);

      await fleetPage.goto();
      await expect(fleetPage.getPageHeading().first()).toBeVisible({ timeout: 30000 });

      await expect(async () => {
        await expect(treeView.getAllTreeItems().first()).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('2: HTPasswd user stops the VM via UI Actions', async () => {
      const session = await asUser(HTPASSWD_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const vmDetails = new VmDetailsPage(session.page);

      await expect(async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });

      await vmDetails.clickActionButton('stop');

      await expect(async () => {
        await expect(vmDetails.getStatusLabel()).toContainText('Stopped', { timeout: 5000 });
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('3: LDAP user sees Stopped and starts VM via UI Actions', async () => {
      const session = await asUser(LDAP_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const vmDetails = new VmDetailsPage(session.page);

      await expect(async () => {
        await fleetPage.gotoVmDetails(CLUSTER, VM_NAMESPACE, VM_NAME);
        await expect(vmDetails.getPageHeading()).toBeVisible({ timeout: 15000 });
      }).toPass({ intervals: [10000, 15000], timeout: 120000 });

      await expect(vmDetails.getStatusLabel()).toContainText('Stopped', { timeout: 30000 });

      await vmDetails.clickActionButton('start');

      await expect(async () => {
        await expect(vmDetails.getStatusLabel()).toContainText('Running', { timeout: 5000 });
      }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
    });
  });
});
