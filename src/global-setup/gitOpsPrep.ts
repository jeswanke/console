/**
 * GitOps / addon bootstrap when `E2E_GITOPS_PREP` and `--project alc` (see `global-setup.ts`).
 * Expects merged kubeconfig from cluster prep (`MC_MERGED_kubeconfig`, hub context `local-cluster`) unless merge was skipped.
 */

import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { LOG_GITOPS_PREP } from './logPrefix';
import { assertOpenshiftGitOpsOperatorRunning } from './operatorPreflight';
import { getRepoRoot } from './repoRoot';

const execFileAsync = promisify(execFile);

const GITOPS_POLL_INTERVAL_MS = 10_000;
const GITOPS_POLL_TIMEOUT_MS = 120_000;
const ACM_POD_TARGET_COUNT = 3;
const CLUSTERSET_LABEL = 'cluster.open-cluster-management.io/clusterset=auto-gitops-cluster-set';

export function isGitOpsPrepEnabled(): boolean {
  const v = process.env.E2E_GITOPS_PREP?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') {
    return false;
  }
  return v === '1' || v === 'true' || v === 'yes';
}

async function oc(
  args: string[],
  options?: { ignoreError?: boolean }
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const r = await execFileAsync('oc', args, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', code: 0 };
  } catch (e: unknown) {
    const err = e as { code?: number; stdout?: string; stderr?: string; message?: string };
    const code = typeof err.code === 'number' ? err.code : 1;
    if (options?.ignoreError) {
      return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? '',
        code,
      };
    }
    const detail = [err.stderr, err.stdout].filter(Boolean).join('\n') || err.message || String(e);
    throw new Error(`${LOG_GITOPS_PREP} oc ${args.join(' ')} failed:\n${detail}`);
  }
}

function readPrimaryManagedClusterName(repoRoot: string): string {
  const fromEnv = process.env.E2E_MANAGED_CLUSTER_NAME?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const jsonPath = path.join(repoRoot, '.auth', 'managedClusters.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `${LOG_GITOPS_PREP} missing ${jsonPath}. Run managed cluster prep or set E2E_MANAGED_CLUSTER_NAME.`
    );
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw) as { managedClusters?: { name?: string }[] };
  const first = data.managedClusters?.[0]?.name?.trim();
  if (!first) {
    throw new Error(
      `${LOG_GITOPS_PREP} no managed clusters in ${jsonPath}. Set E2E_MANAGED_CLUSTER_NAME if prep was skipped.`
    );
  }
  return first;
}

async function waitForAcmGitopsPods(): Promise<void> {
  const deadline = Date.now() + GITOPS_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { stdout } = await oc(['get', 'pods', '-n', 'openshift-gitops', '-o', 'name'], {
      ignoreError: true,
    });
    const lines = stdout
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const acmPods = lines.filter((name) => name.includes('acm-'));
    if (acmPods.length === ACM_POD_TARGET_COUNT) {
      console.log(
        `${LOG_GITOPS_PREP} Found ${acmPods.length} acm-* pod(s) in openshift-gitops (expected ${ACM_POD_TARGET_COUNT}).`
      );
      return;
    }
    console.log(
      `${LOG_GITOPS_PREP} Waiting for acm-* pods in openshift-gitops (have ${acmPods.length}, need exactly ${ACM_POD_TARGET_COUNT}) …`
    );
    await new Promise((r) => setTimeout(r, GITOPS_POLL_INTERVAL_MS));
  }
  const last = await oc(['get', 'pods', '-n', 'openshift-gitops', '-o', 'name'], {
    ignoreError: true,
  });
  throw new Error(
    `${LOG_GITOPS_PREP} timed out after ${GITOPS_POLL_TIMEOUT_MS}ms waiting for ${ACM_POD_TARGET_COUNT} acm-* pods in openshift-gitops. Last: ${last.stdout}`
  );
}

async function ensureManagedClusterClustersetLabel(managedCluster: string): Promise<void> {
  const { stdout } = await oc(['get', 'managedcluster', managedCluster, '--show-labels'], {
    ignoreError: true,
  });
  if (stdout.includes(CLUSTERSET_LABEL)) {
    console.log(`${LOG_GITOPS_PREP} clusterset label already present on ${managedCluster}.`);
    return;
  }
  console.log(
    `${LOG_GITOPS_PREP} Labeling managedcluster ${managedCluster} with ${CLUSTERSET_LABEL}`
  );
  await oc(['label', '--overwrite', 'managedcluster', managedCluster, CLUSTERSET_LABEL], {
    ignoreError: true,
  });
}

export async function runGitOpsPrep(): Promise<void> {
  const skipInterop = process.env.E2E_OCP_INTEROP?.trim() === '1';
  if (skipInterop) {
    console.log(
      `${LOG_GITOPS_PREP} Skipping (E2E_OCP_INTEROP=1).`
    );
    return;
  }

  await assertOpenshiftGitOpsOperatorRunning();

  const repoRoot = getRepoRoot();
  const gitOpsDir = path.join(repoRoot, 'scripts', 'gitops');
  const operatorsDir = path.join(gitOpsDir, 'templates', 'operators_yaml');
  const installOpsPolicy = path.join(operatorsDir, 'install-ops-policy.yaml');
  const gitopsAddon = path.join(operatorsDir, 'gitops-addon.yaml');
  const gitopsClusterAddonOcp = path.join(operatorsDir, 'gitops-cluster-addon-ocp.yaml');
  const argocdScript = path.join(gitOpsDir, 'argocd-integration.sh');

  for (const p of [installOpsPolicy, gitopsAddon, gitopsClusterAddonOcp, argocdScript]) {
    if (!fs.existsSync(p)) {
      throw new Error(`${LOG_GITOPS_PREP} required file missing: ${p}`);
    }
  }

  const managedCluster = readPrimaryManagedClusterName(repoRoot);
  console.log(`${LOG_GITOPS_PREP} Using managed cluster: ${managedCluster}`);

  const hubCtx = (await oc(['config', 'current-context'])).stdout.trim();
  if (!hubCtx) {
    throw new Error(
      `${LOG_GITOPS_PREP} oc config current-context is empty; log in to the hub first.`
    );
  }

  let onManagedContext = false;

  try {
    console.log(`${LOG_GITOPS_PREP} Running argocd-integration.sh skip-install …`);
    await execFileAsync('bash', [argocdScript, 'skip-install'], {
      env: process.env,
      maxBuffer: 50 * 1024 * 1024,
      timeout: 400_000,
    });

    console.log(`${LOG_GITOPS_PREP} Applying install-ops-policy …`);
    await oc(['apply', '-f', installOpsPolicy]);

    console.log(`${LOG_GITOPS_PREP} Applying gitops-addon in namespace ${managedCluster} …`);
    await oc(['apply', '-f', gitopsAddon, '-n', managedCluster]);

    console.log(`${LOG_GITOPS_PREP} Applying gitops-cluster-addon-ocp (best-effort) …`);
    await oc(['apply', '-f', gitopsClusterAddonOcp], { ignoreError: true });

    console.log(`${LOG_GITOPS_PREP} Switching to managed cluster context: ${managedCluster}`);
    await oc(['config', 'use-context', managedCluster]);
    onManagedContext = true;

    const current = (await oc(['config', 'current-context'])).stdout.trim();
    if (current !== managedCluster) {
      throw new Error(
        `${LOG_GITOPS_PREP} expected current context ${managedCluster}, got ${current}. Run cluster kubeconfig merge (setup-managed-cluster-kubeconfig.sh) or set KUBECONFIG to a merged file with matching context names.`
      );
    }

    await waitForAcmGitopsPods();

    console.log(`${LOG_GITOPS_PREP} Restoring hub context: ${hubCtx}`);
    await oc(['config', 'use-context', hubCtx]);
    onManagedContext = false;

    console.log(`${LOG_GITOPS_PREP} Deleting gitops-cluster-addon-ocp resources (best-effort) …`);
    await oc(['delete', '-f', gitopsClusterAddonOcp, '--ignore-not-found'], { ignoreError: true });

    await ensureManagedClusterClustersetLabel(managedCluster);

    console.log(`${LOG_GITOPS_PREP} Done.`);
  } finally {
    if (onManagedContext) {
      try {
        await oc(['config', 'use-context', hubCtx]);
        console.log(`${LOG_GITOPS_PREP} Restored hub context after error: ${hubCtx}`);
      } catch (e) {
        console.error(
          `${LOG_GITOPS_PREP} Failed to restore hub context; fix kubeconfig manually.`,
          e
        );
      }
    }
  }
}
