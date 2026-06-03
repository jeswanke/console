/**
 * Fail fast before Ansible / GitOps prep if required operators are missing on the hub.
 * Parity with application-ui-test `checkAnsibleOperator` / `checkGitopsOperator` (pod presence).
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

import { isTruthyEnv } from './envTruthy';
import { LOG_ANSIBLE_PREP, LOG_GITOPS_PREP } from './logPrefix';

const execFileAsync = promisify(execFile);

export function isOperatorPreflightSkipped(): boolean {
  return isTruthyEnv(process.env.E2E_SKIP_OPERATOR_PREFLIGHT);
}

async function runningPodNames(namespace: string): Promise<string> {
  try {
    const r = await execFileAsync(
      'oc',
      ['get', 'pods', '-n', namespace, '--field-selector=status.phase=Running', '-o', 'name'],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    return r.stdout ?? '';
  } catch (e: unknown) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    const detail = [err.stderr, err.stdout].filter(Boolean).join('\n') || err.message || String(e);
    throw new Error(
      `oc get pods -n ${namespace} failed (log in to the hub and ensure namespace exists):\n${detail}`
    );
  }
}

/** AAP operator subscription pods required for suite preflight. */
const AAP_REQUIRED_SUBSTRINGS = [
  'automation-controller-operator-controller-manager',
  'automation-hub-operator-controller-manager',
  'resource-operator-controller-manager',
] as const;

/** OpenShift GitOps / Argo CD core workloads in `openshift-gitops` (hub). */
const GITOPS_REQUIRED_SUBSTRINGS = [
  'openshift-gitops-server',
  'openshift-gitops-application-controller',
  'openshift-gitops-applicationset-controller',
  'openshift-gitops-repo-server',
] as const;

function assertSubstringsPresent(
  logPrefix: string,
  label: string,
  haystack: string,
  required: readonly string[]
): void {
  const missing = required.filter((s) => !haystack.includes(s));
  if (missing.length > 0) {
    throw new Error(
      `${logPrefix} ${label}: expected Running pods containing ${missing
        .map((m) => `"${m}"`)
        .join(', ')}. Install the operator or set E2E_SKIP_OPERATOR_PREFLIGHT=1.`
    );
  }
}

/**
 * Ensures Ansible Automation Platform operator pods exist in namespace `AAP_NAMESPACE` (default `aap`).
 */
export async function assertAapOperatorRunning(): Promise<void> {
  if (isOperatorPreflightSkipped()) {
    console.log(`${LOG_ANSIBLE_PREP} Skipping AAP operator check (E2E_SKIP_OPERATOR_PREFLIGHT is set).`);
    return;
  }
  const ns = process.env.AAP_NAMESPACE?.trim() || 'aap';
  console.log(`${LOG_ANSIBLE_PREP} Checking AAP operator pods in namespace ${ns} …`);
  const names = await runningPodNames(ns);
  assertSubstringsPresent(LOG_ANSIBLE_PREP, 'AAP operator', names, AAP_REQUIRED_SUBSTRINGS);
  console.log(`${LOG_ANSIBLE_PREP} AAP operator pods look present.`);
}

/**
 * Ensures OpenShift GitOps (Argo CD) workloads exist in `openshift-gitops` on the current cluster (hub).
 */
export async function assertOpenshiftGitOpsOperatorRunning(): Promise<void> {
  if (isOperatorPreflightSkipped()) {
    console.log(`${LOG_GITOPS_PREP} Skipping GitOps operator check (E2E_SKIP_OPERATOR_PREFLIGHT is set).`);
    return;
  }
  const ns = 'openshift-gitops';
  console.log(`${LOG_GITOPS_PREP} Checking OpenShift GitOps pods in namespace ${ns} …`);
  const names = await runningPodNames(ns);
  assertSubstringsPresent(LOG_GITOPS_PREP, 'OpenShift GitOps', names, GITOPS_REQUIRED_SUBSTRINGS);
  console.log(`${LOG_GITOPS_PREP} OpenShift GitOps pods look present.`);
}
