/**
 * VM test setup/teardown helpers for FG-RBAC specs.
 *
 * Encapsulates OcCliService so spec files do not import it directly.
 * Follows the lib helper pattern from governance/policy-labels-setup.ts.
 */

import { expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';

const oc = new OcCliService();

// ---------------------------------------------------------------------------
// VM lifecycle
// ---------------------------------------------------------------------------

export async function ensureVmReady(
  name: string,
  namespace: string,
  labels: Record<string, string>,
  options?: { context?: string },
): Promise<void> {
  await oc.vmEnsureTestVM(name, namespace, labels, options);
  await expect(async () => {
    const running = await oc.vmIsRunning(name, namespace, options);
    expect(running).toBeTruthy();
  }).toPass({ intervals: [5000, 10000, 15000], timeout: 120000 });
}

export async function ensureVmWithPvcReady(
  name: string,
  namespace: string,
  labels: Record<string, string>,
): Promise<void> {
  await oc.vmEnsureTestVMWithPVC(name, namespace, labels);
  await expect(async () => {
    const running = await oc.vmIsRunning(name, namespace);
    expect(running).toBeTruthy();
  }).toPass({ intervals: [10000, 15000, 30000], timeout: 300000 });

  // Polarion prerequisite: VM must be LiveMigratable for CCLM
  await expect(async () => {
    const liveMigratable = await oc.vmIsLiveMigratable(name, namespace);
    expect(liveMigratable, `VM ${name} must be LiveMigratable=True (requires RWX storage)`).toBeTruthy();
  }).toPass({ intervals: [5000, 10000], timeout: 60000 });
}

export async function cleanupVm(
  name: string,
  namespace: string,
  options?: { context?: string },
): Promise<void> {
  await oc.vmDeleteTestVM(name, namespace, options);
}

export async function cleanupVmAndSnapshots(name: string, namespace: string): Promise<void> {
  await oc.vmDeleteSnapshots(name, namespace);
  await oc.vmDeleteTestVM(name, namespace);
}

// ---------------------------------------------------------------------------
// MCRA / user cleanup
// ---------------------------------------------------------------------------

export async function cleanupMcraAndUser(username: string): Promise<void> {
  await oc.mcraDeleteAllForUser(username);
  await oc.deleteUser(username);
}

// ---------------------------------------------------------------------------
// CCLM prerequisites
// ---------------------------------------------------------------------------

export async function checkCclmPrerequisites(spokeCluster: string): Promise<boolean> {
  const mtvOnHub = await oc.mtvIsInstalled();
  const cnvOnSpoke = await oc.cnvIsAvailableOnCluster(spokeCluster);
  console.log(`[CCLM prereqs] mtvOnHub=${mtvOnHub}, cnvOnSpoke=${cnvOnSpoke}, spoke=${spokeCluster}`);
  return mtvOnHub && cnvOnSpoke;
}

export async function cleanupCclmResources(
  vmName: string,
  vmNamespace: string,
  spokeCluster: string,
): Promise<void> {
  await oc.vmDeleteTestVM(vmName, vmNamespace);
  await oc.deleteDataVolume(`${vmName}-dv`, vmNamespace);
  await oc.vmDeleteTestVM(vmName, vmNamespace, { context: spokeCluster });
  await oc.cleanupForkliftResources('mtv-integrations');
}

// ---------------------------------------------------------------------------
// CLI verification helpers
// ---------------------------------------------------------------------------

export async function verifyUserExists(username: string): Promise<boolean> {
  const output = await oc.run(
    `oc get user ${username} --no-headers 2>/dev/null || echo NOT_FOUND`,
  );
  return !output.includes('NOT_FOUND');
}

export async function verifyVmDeleted(name: string, namespace: string): Promise<void> {
  await expect(async () => {
    const output = await oc.run(
      `oc get vm ${name} -n ${namespace} --no-headers 2>/dev/null || echo "NotFound"`,
    );
    expect(output).toContain('NotFound');
  }).toPass({ intervals: [5000, 10000], timeout: 60000 });
}

export async function verifyNoMcvForVm(vmName: string, clusterName: string): Promise<number> {
  const mcvCount = await oc.run(
    `oc get managedclusterview -n ${clusterName} -o json 2>/dev/null | jq -r '[.items[] | select(.spec.scope.name == "${vmName}")] | length'`,
  );
  return parseInt(mcvCount.trim());
}

export async function verifySnapshotDeleted(snapshotName: string, namespace: string): Promise<void> {
  await expect(async () => {
    const output = await oc.run(
      `oc get virtualmachinesnapshot ${snapshotName} -n ${namespace} --no-headers 2>/dev/null || echo "NotFound"`,
    );
    expect(output).toContain('NotFound');
  }).toPass({ intervals: [5000, 10000], timeout: 60000 });
}

export async function verifySnapshotReady(snapshotName: string, namespace: string): Promise<void> {
  await expect(async () => {
    const phase = await oc.run(
      `oc get virtualmachinesnapshot ${snapshotName} -n ${namespace} -o jsonpath='{.status.phase}' 2>/dev/null || echo "Pending"`,
    );
    expect(phase).toContain('Succeeded');
  }).toPass({ intervals: [5000, 10000], timeout: 60000 });
}

export async function checkSnapshotExists(vmName: string, namespace: string): Promise<number> {
  const output = await oc.run(
    `oc get virtualmachinesnapshot -n ${namespace} --no-headers 2>/dev/null | grep "${vmName}" | wc -l`,
  );
  return parseInt(output.trim());
}

export async function createSnapshotViaCli(
  snapshotName: string,
  vmName: string,
  namespace: string,
): Promise<void> {
  await oc.vmCreateSnapshot(snapshotName, vmName, namespace);
  await verifySnapshotReady(snapshotName, namespace);
}

// ---------------------------------------------------------------------------
// Forklift Plan monitoring (CCLM)
// ---------------------------------------------------------------------------

export async function getForkliftPlans(): Promise<string> {
  return oc.run(
    'oc get plans.forklift.konveyor.io -A --no-headers 2>/dev/null || echo "none"',
  );
}

export async function getForkliftPlanStatus(namespace: string): Promise<string> {
  return oc.run(
    `oc get plans.forklift.konveyor.io -n ${namespace} -o jsonpath='{range .items[*]}{.metadata.name}: phase={.status.migration.vms[*].phase} conditions={.status.conditions[*].type}{end}' 2>/dev/null || echo "no-plans"`,
  );
}

export async function getVmStatusOnSpoke(
  vmName: string,
  namespace: string,
  spokeCluster: string,
  kcPath: string,
): Promise<string> {
  const status = await oc.run(
    `KUBECONFIG="${kcPath}" oc get vm ${vmName} -n ${namespace} --context=${spokeCluster} -o jsonpath='{.status.printableStatus}' 2>/dev/null || echo "NotFound"`,
  );
  return status.trim();
}
