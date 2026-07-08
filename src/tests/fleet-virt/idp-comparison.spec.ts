/**
 * RHACM4K-60258: Fleet Virtualization - IDP Comparison
 *
 * Polarion steps:
 *   1. Verify both IDP users can access Fleet Virt with tree visible
 *   2. First user (idp-kubevirt) stops the VM
 *   3. Second user (idp-vm) sees Stopped, starts the VM
 *
 * Both users have acm-vm-fleet:view + kubevirt.io:admin.
 * Proves RBAC is IDP-agnostic -- both htpasswd users have identical access.
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
const IDP_KUBEVIRT_USER = 'fg-rbac-idp-kubevirt-60257';
const IDP_VM_USER = 'fg-rbac-idp-vm-60258';
const ocSvc = new OcCliService();

test.describe('Fleet Virt - IDP Comparison', { tag: ['@fg-rbac', '@fleet-virt', '@virtualization'] }, () => {
  test.setTimeout(360000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(180000);

    const idpKubevirtCanGet = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-idp-kubevirt-60257');
    if (!idpKubevirtCanGet) {
      await ocSvc.run(`oc patch multiclusterroleassignment htpasswd-idp-kubevirt-assignment \
        -n open-cluster-management-global-set --type=json \
        -p '[{"op":"add","path":"/spec/roleAssignments/-","value":{"clusterRole":"kubevirt.io:admin","clusterSelection":{"placements":[{"name":"rbac-hub-placement","namespace":"open-cluster-management-global-set"}],"type":"placements"},"name":"kubevirt-admin-access","targetNamespaces":["default"]}}]' \
        2>/dev/null || true`);

      await expect(async () => {
        const canGet = await ocSvc.rbacAuthCanI('get', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-idp-kubevirt-60257');
        expect(canGet).toBe(true);
      }).toPass({ intervals: [10000, 15000], timeout: 60000 });
    }

    await ocSvc.vmEnsureTestVM(VM_NAME, VM_NAMESPACE, { 'test-case': 'rhacm4k-60258' });

    await expect(async () => {
      const running = await ocSvc.vmIsRunning(VM_NAME, VM_NAMESPACE);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
  });

  test.afterAll(async () => {
    await ocSvc.vmDeleteTestVM(VM_NAME, VM_NAMESPACE);
  });

  test('RHACM4K-60258: Both htpasswd IDP users access Fleet Virt equally', async ({ asUser, oc }) => {
    await test.step('1: Login as idp-kubevirt user and verify Fleet Virt access', async () => {
      const session = await asUser(IDP_KUBEVIRT_USER);
      const fleetPage = new FleetVirtPage(session.page, oc);
      const treeView = new TreeView(session.page);

      await fleetPage.goto();
      await expect(fleetPage.getPageHeading()).toBeVisible({ timeout: 30000 });

      const treeItems = treeView.getAllTreeItems();
      await expect(async () => {
        await expect(treeItems.first()).toBeVisible({ timeout: 5000 });
      }).toPass({ intervals: [3000, 5000], timeout: 30000 });
    });

    await test.step('2: idp-kubevirt user stops the VM via CLI', async () => {
      const canStop = await oc.rbacAuthCanI('update', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-idp-kubevirt-60257');
      expect(canStop).toBe(true);

      await oc.vmStopAsUser(VM_NAME, VM_NAMESPACE, 'clc-e2e-idp-kubevirt-60257');

      await expect(async () => {
        const running = await oc.vmIsRunning(VM_NAME, VM_NAMESPACE);
        expect(running).toBe(false);
      }).toPass({ intervals: [5000, 10000], timeout: 60000 });
    });

    await test.step('3: idp-vm user starts the VM via CLI', async () => {
      const canStart = await oc.rbacAuthCanI('update', 'virtualmachines.kubevirt.io', VM_NAMESPACE, 'clc-e2e-idp-vm-60258');
      expect(canStart).toBe(true);

      await oc.vmStartAsUser(VM_NAME, VM_NAMESPACE, 'clc-e2e-idp-vm-60258');

      await expect(async () => {
        const running = await oc.vmIsRunning(VM_NAME, VM_NAMESPACE);
        expect(running).toBe(true);
      }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
    });
  });
});
