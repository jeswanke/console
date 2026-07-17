/* Copyright Contributors to the Open Cluster Management project */

import { OcCliService } from '@services/OcCliService';

export async function waitForPolicyPropagation(
  oc: OcCliService,
  name: string,
  namespace: string,
  timeoutMs = 120_000
): Promise<void> {
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const compliant = await oc.run(
        `oc get policy ${name} -n ${namespace} -o jsonpath='{.status.compliant}' 2>/dev/null || true`
      );
      if (compliant && compliant !== "''" && compliant !== '') return;
    } catch {
      // Policy may not exist yet or status not populated
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(`Policy ${namespace}/${name} did not propagate within ${timeoutMs / 1000}s`);
}

export async function waitForAllPoliciesPropagated(
  oc: OcCliService,
  namespace: string,
  policyNames: readonly string[],
  timeoutMs = 120_000
): Promise<void> {
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    let allReady = true;
    for (const name of policyNames) {
      try {
        const status = await oc.run(
          `oc get policy ${name} -n ${namespace} -o jsonpath='{.status.compliant}' 2>/dev/null || true`
        );
        if (!status || status === "''" || status === '') {
          allReady = false;
          break;
        }
      } catch {
        allReady = false;
        break;
      }
    }
    if (allReady) return;
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(`Not all policies propagated within ${timeoutMs / 1000}s`);
}

export async function waitForPolicyStatus(
  oc: OcCliService,
  namespace: string,
  policyName: string,
  expectedCompliant?: string,
  timeoutMs = 180_000
): Promise<void> {
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const status = await oc.run(
        `oc get policy ${policyName} -n ${namespace} -o jsonpath='{.status.compliant}' 2>/dev/null || true`
      );
      if (status && status !== "''" && status !== '') {
        if (!expectedCompliant) return;
        if (status.replace(/'/g, '') === expectedCompliant) return;
      }
    } catch {
      // Policy may not exist yet
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(
    `Policy ${policyName} did not reach expected status ${expectedCompliant || 'any'} within ${timeoutMs / 1000}s`
  );
}

export async function waitForAnyClusterCompliant(
  oc: OcCliService,
  namespace: string,
  policyName: string,
  timeoutMs = 180_000
): Promise<void> {
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const statuses = await oc.run(
        `oc get policy ${policyName} -n ${namespace} ` +
          `-o jsonpath='{range .status.status[*]}{.compliant}{" "}{end}' 2>/dev/null || true`
      );
      const list = statuses.replace(/'/g, '').trim().split(/\s+/);
      if (list.some((s) => s === 'Compliant')) return;
    } catch {
      // Policy may not exist yet
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(
    `No cluster reached Compliant for policy ${policyName} within ${timeoutMs / 1000}s`
  );
}

export async function cleanupPolicyResources(
  oc: OcCliService,
  policyName: string,
  namespace: string
): Promise<void> {
  const placementName = `${policyName}-placement`;
  await oc
    .run(
      `oc delete policy ${policyName} -n ${namespace} --ignore-not-found=true && ` +
        `oc delete placementbinding ${placementName} -n ${namespace} --ignore-not-found=true && ` +
        `oc delete placement ${placementName} -n ${namespace} --ignore-not-found=true`
    )
    .catch(() => undefined);
}
