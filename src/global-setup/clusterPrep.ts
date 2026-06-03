import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { LOG_CLUSTER_PREP } from './logPrefix';
import { getRepoRoot } from './repoRoot';

const execFileAsync = promisify(execFile);

/**
 * Runs {@link scripts/cluster/generate-managed-cluster-data.py} with **cwd** = `authDir`,
 * producing **`managedClusters.json`** next to other `.auth/` artifacts.
 */
export async function runManagedClusterDataGeneration(authDir: string): Promise<void> {
  const repoRoot = getRepoRoot();
  const scriptPath = path.join(repoRoot, 'scripts', 'cluster', 'generate-managed-cluster-data.py');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`${LOG_CLUSTER_PREP} script not found: ${scriptPath}`);
  }

  const pythonBin = process.env.PYTHON_BIN ?? 'python3';
  await execFileAsync(pythonBin, [scriptPath], {
    cwd: authDir,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 400_000,
  });

  const outFile = path.join(authDir, 'managedClusters.json');
  if (!fs.existsSync(outFile)) {
    throw new Error(
      `${LOG_CLUSTER_PREP} expected ${outFile} after generate-managed-cluster-data.py`
    );
  }
}

/** When true, **`globalSetup`** does not run the Python generator (hub unavailable, local dev, etc.). */
export function isManagedClusterPrepExplicitlySkipped(): boolean {
  const v = process.env.E2E_SKIP_MANAGED_CLUSTER_PREP?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * When true, skip merging hub + spoke kubeconfigs during managed cluster prep (you already set
 * `KUBECONFIG` to a merged file, or you do not need spoke contexts named like ManagedCluster resources).
 */
export function isManagedKubeconfigMergeSkipped(): boolean {
  const v = process.env.E2E_SKIP_MANAGED_KUBECONFIG_MERGE?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Runs {@link runManagedClusterDataGeneration} then, unless skipped,
 * {@link runManagedClusterKubeconfigMerge} (managedClusters.json + MC_MERGED_kubeconfig).
 */
export async function runManagedClusterPrep(authDir: string): Promise<void> {
  console.log(`${LOG_CLUSTER_PREP} Running scripts/cluster/generate-managed-cluster-data.py …`);
  await runManagedClusterDataGeneration(authDir);
  console.log(`${LOG_CLUSTER_PREP} Managed cluster context written to .auth/managedClusters.json`);

  if (!isManagedKubeconfigMergeSkipped()) {
    console.log(
      `${LOG_CLUSTER_PREP} Running scripts/cluster/setup-managed-cluster-kubeconfig.sh (MC_MERGED_kubeconfig) …`
    );
    await runManagedClusterKubeconfigMerge(authDir);
  } else {
    console.log(
      `${LOG_CLUSTER_PREP} Skipping managed kubeconfig merge (E2E_SKIP_MANAGED_KUBECONFIG_MERGE is set).`
    );
  }
}

/**
 * Merge spoke kubeconfigs and rename each context to the ManagedCluster name
 * so `oc config use-context <mc>` works. Writes MC_MERGED_kubeconfig and sets KUBECONFIG.
 * Requires jq and yq on PATH.
 */
export async function runManagedClusterKubeconfigMerge(authDir: string): Promise<void> {
  const repoRoot = getRepoRoot();
  const scriptPath = path.join(
    repoRoot,
    'scripts',
    'cluster',
    'setup-managed-cluster-kubeconfig.sh'
  );
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Managed kubeconfig merge: script not found at ${scriptPath}`);
  }

  await execFileAsync('bash', [scriptPath], {
    cwd: authDir,
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
    timeout: 400_000,
  });

  const merged = path.join(authDir, 'MC_MERGED_kubeconfig');
  if (!fs.existsSync(merged)) {
    throw new Error(`${LOG_CLUSTER_PREP} expected ${merged} after kubeconfig merge script`);
  }

  process.env.KUBECONFIG = merged;
  console.log(
    `${LOG_CLUSTER_PREP} Using KUBECONFIG=${merged} for subsequent oc commands in this process.`
  );
}
