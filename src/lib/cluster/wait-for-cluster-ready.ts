/**
 * Cluster readiness polling via `oc` CLI.
 *
 * Uses `oc wait` for Hive ClusterDeployments and HostedClusters,
 * with fallback polling for status verification.
 */
import { expect } from '@playwright/test';
import type { OcCliService } from '@services/OcCliService';
import { PROVIDER_CLOUD_LABEL } from '@constants/cluster-create';

export interface WaitOptions {
  /** Timeout in milliseconds (default: 50 minutes). */
  timeout?: number;
  /** Namespace for the ClusterDeployment (defaults to clusterName). */
  namespace?: string;
}

const DEFAULT_TIMEOUT_MS = 50 * 60 * 1000;

/**
 * Waits for a Hive-based ClusterDeployment to reach Ready condition.
 * Uses `oc wait --for=condition=Ready` with the specified timeout.
 */
export async function waitForClusterReady(
  oc: OcCliService,
  clusterName: string,
  options: WaitOptions = {}
): Promise<void> {
  const namespace = options.namespace ?? clusterName;
  const timeoutSec = Math.floor((options.timeout ?? DEFAULT_TIMEOUT_MS) / 1000);

  await oc.run(
    `oc wait clusterdeployment/${clusterName} -n ${namespace} ` +
      `--for=condition=Ready --timeout=${timeoutSec}s`
  );
}

/**
 * Waits for a Hosted Control Plane cluster (KubeVirt) to become Available.
 */
export async function waitForHostedClusterReady(
  oc: OcCliService,
  clusterName: string,
  options: WaitOptions = {}
): Promise<void> {
  const namespace = options.namespace ?? 'clusters';
  const timeoutSec = Math.floor((options.timeout ?? DEFAULT_TIMEOUT_MS) / 1000);

  await oc.run(
    `oc wait hostedcluster/${clusterName} -n ${namespace} ` +
      `--for=condition=Available --timeout=${timeoutSec}s`
  );
}

/**
 * Verifies the ManagedCluster resource exists and is joined/available.
 */
export async function assertManagedClusterJoined(
  oc: OcCliService,
  clusterName: string
): Promise<void> {
  await oc.run(
    `oc wait managedcluster/${clusterName} ` + `--for=condition=ManagedClusterJoined --timeout=300s`
  );
}

/**
 * Gets the current status of a ClusterDeployment (for logging/debugging).
 */
export async function getClusterDeploymentStatus(
  oc: OcCliService,
  clusterName: string,
  namespace?: string
): Promise<string> {
  const ns = namespace ?? clusterName;
  return oc.run(
    `oc get clusterdeployment/${clusterName} -n ${ns} ` +
      `-o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'`
  );
}

/**
 * Asserts that the ClusterDeployment has not exceeded its install attempts.
 */
export async function assertInstallAttemptCount(
  oc: OcCliService,
  clusterName: string,
  maxAttempts: number,
  namespace?: string
): Promise<void> {
  const ns = namespace ?? clusterName;
  const result = await oc.run(
    `oc get clusterdeployment/${clusterName} -n ${ns} ` + `-o jsonpath='{.status.installAttempts}'`
  );
  const cleaned = result.replace(/'/g, '').trim();
  const attempts = cleaned ? parseInt(cleaned, 10) : 1;
  expect(attempts, `ClusterDeployment ${clusterName} install attempts`).toBeLessThanOrEqual(
    maxAttempts
  );
}

const PROVIDER_CRED_SECRET_SUFFIX: Record<string, string> = {
  aws: 'aws-creds',
  gcp: 'gcp-creds',
  azure: 'azure-creds',
  azgov: 'azure-creds',
};

export async function assertClusterSecrets(
  oc: OcCliService,
  clusterName: string,
  provider: string,
  namespace?: string
): Promise<void> {
  const ns = namespace ?? clusterName;
  const credSuffix = PROVIDER_CRED_SECRET_SUFFIX[provider];
  const secrets = [
    ...(credSuffix ? [`${clusterName}-${credSuffix}`] : []),
    `${clusterName}-pull-secret`,
    `${clusterName}-ssh-private-key`,
  ];

  for (const secretName of secrets) {
    const result = await oc.run(`oc get secret ${secretName} -n ${ns} --ignore-not-found -o name`);
    expect(result.trim(), `Secret ${secretName} in namespace ${ns}`).toBeTruthy();
  }
}

export async function assertClusterLabels(
  oc: OcCliService,
  clusterName: string,
  expectedLabels?: Record<string, string>
): Promise<void> {
  if (!expectedLabels || Object.keys(expectedLabels).length === 0) return;

  const labelsJson = await oc.run(`oc get managedcluster ${clusterName} -o json`);
  const labels = JSON.parse(labelsJson).metadata.labels;

  for (const [key, value] of Object.entries(expectedLabels)) {
    expect(labels[key], `Label ${key} on ${clusterName}`).toBe(value);
  }
}

export async function assertAcmAutoLabels(
  oc: OcCliService,
  clusterName: string,
  provider: string
): Promise<void> {
  const json = await oc.execArgv(['get', 'managedcluster', clusterName, '-o', 'json']);
  const labels = JSON.parse(json).metadata.labels;

  const expectedCloud = PROVIDER_CLOUD_LABEL[provider];
  if (expectedCloud) {
    expect(labels.cloud, `ACM cloud label on ${clusterName}`).toBe(expectedCloud);
  }
  expect(labels.vendor, `ACM vendor label on ${clusterName}`).toBe('OpenShift');
}

const CLEANUP_POLL_INTERVAL_MS = 10_000;
const DESTROY_DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const DETACH_DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export async function waitForClusterDestroyed(
  oc: OcCliService,
  clusterName: string,
  options: WaitOptions = {}
): Promise<void> {
  const timeoutMs = options.timeout ?? DESTROY_DEFAULT_TIMEOUT_MS;
  const namespace = options.namespace ?? clusterName;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const mcResult = await oc
      .run(`oc get managedcluster ${clusterName} --ignore-not-found -o name`)
      .catch(() => '');

    const nsResult = await oc
      .run(`oc get namespace ${namespace} --ignore-not-found -o name`)
      .catch(() => '');

    if (!mcResult.trim() && !nsResult.trim()) return;

    await new Promise((r) => setTimeout(r, CLEANUP_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Cluster ${clusterName} was not fully destroyed within ${timeoutMs / 60_000} minutes`
  );
}

export async function waitForClusterDetached(
  oc: OcCliService,
  clusterName: string,
  options: WaitOptions = {}
): Promise<void> {
  const timeoutMs = options.timeout ?? DETACH_DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await oc
      .run(`oc get managedcluster ${clusterName} --ignore-not-found -o name`)
      .catch(() => '');

    if (!result.trim()) return;

    await new Promise((r) => setTimeout(r, CLEANUP_POLL_INTERVAL_MS));
  }

  throw new Error(`Cluster ${clusterName} was not detached within ${timeoutMs / 60_000} minutes`);
}
