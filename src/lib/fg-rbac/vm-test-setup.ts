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
  options?: { context?: string }
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
  labels: Record<string, string>
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
  options?: { context?: string }
): Promise<void> {
  await oc.vmDeleteTestVM(name, namespace, options);
}

export async function cleanupVmAndSnapshots(name: string, namespace: string): Promise<void> {
  await oc.vmDeleteSnapshots(name, namespace);
  await oc.vmDeleteTestVM(name, namespace);
}

// ---------------------------------------------------------------------------
// Multi-VM lifecycle (bulk migration)
// ---------------------------------------------------------------------------

export async function ensureMultipleVmsWithPvcReady(
  names: string[],
  namespace: string,
  labels: Record<string, string>
): Promise<void> {
  for (const name of names) {
    await oc.vmEnsureTestVMWithPVC(name, namespace, labels);
  }
  for (const name of names) {
    await expect(async () => {
      const running = await oc.vmIsRunning(name, namespace);
      expect(running).toBeTruthy();
    }).toPass({ intervals: [10000, 15000, 30000], timeout: 300000 });
  }
}

export async function cleanupMultipleCclmResources(
  names: string[],
  namespace: string,
  spokeCluster: string
): Promise<void> {
  for (const name of names) {
    await oc.vmDeleteTestVM(name, namespace);
    await oc.deleteDataVolume(`${name}-dv`, namespace);
    await oc.vmDeleteTestVM(name, namespace, { context: spokeCluster });
  }
  await oc.cleanupForkliftResources('mtv-integrations');
  await cleanupOrphanedVmims(namespace, spokeCluster);
}

export async function cleanupOrphanedVmims(namespace: string, spokeContext: string): Promise<void> {
  // Clean VMIMs on spoke
  const spokeVmims = await oc.run(
    `oc get virtualmachineinstancemigrations -n ${namespace} --context ${spokeContext} -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || true`
  );
  for (const vmim of spokeVmims.trim().split(/\s+/).filter(Boolean)) {
    await oc.run(
      `oc patch virtualmachineinstancemigration ${vmim} -n ${namespace} --context ${spokeContext} --type=merge -p '{"metadata":{"finalizers":null}}' 2>/dev/null || true`
    );
    await oc.run(
      `oc delete virtualmachineinstancemigration ${vmim} -n ${namespace} --context ${spokeContext} --force --grace-period=0 2>/dev/null || true`
    );
  }
  // Clean VMIMs on hub (source-side VMIMs from previous CCLM runs)
  const hubVmims = await oc.run(
    `oc get virtualmachineinstancemigrations -n ${namespace} -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || true`
  );
  for (const vmim of hubVmims.trim().split(/\s+/).filter(Boolean)) {
    await oc.run(
      `oc patch virtualmachineinstancemigration ${vmim} -n ${namespace} --type=merge -p '{"metadata":{"finalizers":null}}' 2>/dev/null || true`
    );
    await oc.run(
      `oc delete virtualmachineinstancemigration ${vmim} -n ${namespace} --force --grace-period=0 2>/dev/null || true`
    );
  }
}

// ---------------------------------------------------------------------------
// ResourceQuota helpers (failed migration simulation)
// ---------------------------------------------------------------------------

export async function applySpokeResourceQuota(
  namespace: string,
  spokeContext: string
): Promise<void> {
  await oc.applyResourceQuota(
    'mtv-migration-deny',
    namespace,
    {
      cpu: '100m',
      memory: '256Mi',
    },
    { context: spokeContext }
  );
}

export async function deleteSpokeResourceQuota(
  namespace: string,
  spokeContext: string
): Promise<void> {
  await oc.deleteResourceQuota('mtv-migration-deny', namespace, { context: spokeContext });
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
  spokeCluster: string
): Promise<void> {
  await oc.vmDeleteTestVM(vmName, vmNamespace);
  await oc.deleteDataVolume(`${vmName}-dv`, vmNamespace);
  await oc.vmDeleteTestVM(vmName, vmNamespace, { context: spokeCluster });
  await oc.cleanupForkliftResources('mtv-integrations');
  await cleanupOrphanedVmims(vmNamespace, spokeCluster);
}

// ---------------------------------------------------------------------------
// CLI verification helpers
// ---------------------------------------------------------------------------

export async function verifyUserExists(username: string): Promise<boolean> {
  const output = await oc.run(`oc get user ${username} --no-headers 2>/dev/null || echo NOT_FOUND`);
  return !output.includes('NOT_FOUND');
}

export async function verifyVmDeleted(name: string, namespace: string): Promise<void> {
  await expect(async () => {
    const output = await oc.run(
      `oc get vm ${name} -n ${namespace} --no-headers 2>/dev/null || echo "NotFound"`
    );
    expect(output).toContain('NotFound');
  }).toPass({ intervals: [5000, 10000], timeout: 60000 });
}

export async function verifyNoMcvForVm(vmName: string, clusterName: string): Promise<number> {
  const mcvCount = await oc.run(
    `oc get managedclusterview -n ${clusterName} -o json 2>/dev/null | jq -r '[.items[] | select(.spec.scope.name == "${vmName}")] | length'`
  );
  return parseInt(mcvCount.trim());
}

export async function verifySnapshotDeleted(
  snapshotName: string,
  namespace: string
): Promise<void> {
  await expect(async () => {
    const output = await oc.run(
      `oc get virtualmachinesnapshot ${snapshotName} -n ${namespace} --no-headers 2>/dev/null || echo "NotFound"`
    );
    expect(output).toContain('NotFound');
  }).toPass({ intervals: [5000, 10000], timeout: 60000 });
}

export async function verifySnapshotReady(snapshotName: string, namespace: string): Promise<void> {
  await expect(async () => {
    const phase = await oc.run(
      `oc get virtualmachinesnapshot ${snapshotName} -n ${namespace} -o jsonpath='{.status.phase}' 2>/dev/null || echo "Pending"`
    );
    expect(phase).toContain('Succeeded');
  }).toPass({ intervals: [5000, 10000], timeout: 60000 });
}

export async function checkSnapshotExists(vmName: string, namespace: string): Promise<number> {
  const output = await oc.run(
    `oc get virtualmachinesnapshot -n ${namespace} --no-headers 2>/dev/null | grep "${vmName}" | wc -l`
  );
  return parseInt(output.trim());
}

export async function createSnapshotViaCli(
  snapshotName: string,
  vmName: string,
  namespace: string
): Promise<void> {
  await oc.vmCreateSnapshot(snapshotName, vmName, namespace);
  await verifySnapshotReady(snapshotName, namespace);
}

// ---------------------------------------------------------------------------
// Forklift lifecycle (CCLM)
// ---------------------------------------------------------------------------

export async function cleanupForkliftPlansAndMigrations(
  namespace = 'mtv-integrations',
): Promise<void> {
  await oc.cleanupForkliftResources(namespace);
}

export async function haltAndRestartVmsOnSpoke(
  names: string[],
  namespace: string,
  spokeCluster: string,
  kcPath: string
): Promise<void> {
  for (const name of names) {
    await oc.run(
      `oc patch vm ${name} -n ${namespace} --context ${spokeCluster} --kubeconfig ${kcPath} --type=merge -p '{"spec":{"runStrategy":"Halted"}}' 2>/dev/null || true`
    );
  }
  await new Promise((r) => setTimeout(r, 15000));
  for (const name of names) {
    await oc.run(
      `oc patch vm ${name} -n ${namespace} --context ${spokeCluster} --kubeconfig ${kcPath} --type=merge -p '{"spec":{"runStrategy":"Always"}}' 2>/dev/null || true`
    );
  }
}

export async function deleteHubVms(names: string[], namespace: string): Promise<void> {
  for (const name of names) {
    await oc.run(
      `oc delete vm ${name} -n ${namespace} --force --grace-period=0 2>/dev/null || true`
    );
  }
}

export async function verifyHubVmsDeleted(names: string[], namespace: string): Promise<void> {
  for (const name of names) {
    const result = await oc.run(`oc get vm ${name} -n ${namespace} --no-headers 2>&1 || true`);
    if (!result.includes('NotFound')) {
      throw new Error(`VM ${name} still exists on hub`);
    }
  }
}

// ---------------------------------------------------------------------------
// Forklift Plan monitoring (CCLM)
// ---------------------------------------------------------------------------

export async function getForkliftPlans(): Promise<string> {
  return oc.run('oc get plans.forklift.konveyor.io -A --no-headers 2>/dev/null || echo "none"');
}

export async function getForkliftPlanStatus(namespace: string): Promise<string> {
  return oc.run(
    `oc get plans.forklift.konveyor.io -n ${namespace} -o jsonpath='{range .items[*]}{.metadata.name}: phase={.status.migration.vms[*].phase} conditions={.status.conditions[*].type}{end}' 2>/dev/null || echo "no-plans"`
  );
}

export async function getVmStatusOnSpoke(
  vmName: string,
  namespace: string,
  spokeCluster: string,
  kcPath: string
): Promise<string> {
  const status = await oc.run(
    `KUBECONFIG="${kcPath}" oc get vm ${vmName} -n ${namespace} --context=${spokeCluster} -o jsonpath='{.status.printableStatus}' 2>/dev/null || echo "NotFound"`
  );
  return status.trim();
}
