/* Copyright Contributors to the Open Cluster Management project */

import { assertSafeOcSingleArg, OcCliService } from '@services/OcCliService';

export async function waitForPolicyPropagation(
  oc: OcCliService,
  name: string,
  namespace: string,
  timeoutMs = 120_000
): Promise<void> {
  assertSafeOcSingleArg(name, 'name');
  assertSafeOcSingleArg(namespace, 'namespace');
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const compliant = await oc.execArgv([
        'get',
        'policy',
        name,
        '-n',
        namespace,
        '-o',
        'jsonpath={.status.compliant}',
      ]);
      if (compliant && compliant !== '') return;
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
  assertSafeOcSingleArg(namespace, 'namespace');
  for (const n of policyNames) assertSafeOcSingleArg(n, 'policyName');
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    let allReady = true;
    for (const name of policyNames) {
      try {
        const status = await oc.execArgv([
          'get',
          'policy',
          name,
          '-n',
          namespace,
          '-o',
          'jsonpath={.status.compliant}',
        ]);
        if (!status || status === '') {
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
  assertSafeOcSingleArg(namespace, 'namespace');
  assertSafeOcSingleArg(policyName, 'policyName');
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const status = await oc.execArgv([
        'get',
        'policy',
        policyName,
        '-n',
        namespace,
        '-o',
        'jsonpath={.status.compliant}',
      ]);
      if (status && status !== '') {
        if (!expectedCompliant) return;
        if (status === expectedCompliant) return;
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
  assertSafeOcSingleArg(namespace, 'namespace');
  assertSafeOcSingleArg(policyName, 'policyName');
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const statuses = await oc.execArgv([
        'get',
        'policy',
        policyName,
        '-n',
        namespace,
        '-o',
        'jsonpath={range .status.status[*]}{.compliant}{" "}{end}',
      ]);
      const list = statuses.trim().split(/\s+/);
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

export async function waitForPolicySetStatus(
  oc: OcCliService,
  policySetName: string,
  namespace: string,
  expectedStatus: string,
  timeoutMs = 120_000
): Promise<void> {
  assertSafeOcSingleArg(policySetName, 'policySetName');
  assertSafeOcSingleArg(namespace, 'namespace');
  const pollInterval = 5_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await oc.execArgv([
        'get',
        'policyset',
        policySetName,
        '-n',
        namespace,
        '-o',
        'jsonpath={.status.compliant}',
      ]);
      if (result.trim() === expectedStatus) return;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(
    `PolicySet ${policySetName} did not reach ${expectedStatus} within ${timeoutMs / 1000}s`
  );
}

export async function waitForResourceExists(
  oc: OcCliService,
  kind: string,
  name: string,
  namespace: string,
  timeoutMs = 60_000
): Promise<void> {
  assertSafeOcSingleArg(kind, 'kind');
  assertSafeOcSingleArg(name, 'name');
  assertSafeOcSingleArg(namespace, 'namespace');
  const pollInterval = 5_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await oc.execArgv(['get', kind, name, '-n', namespace, '-o', 'name']);
      return;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(`${kind} ${name} not found in ${namespace} within ${timeoutMs / 1000}s`);
}

export async function cleanupPolicyResources(
  oc: OcCliService,
  policyName: string,
  namespace: string
): Promise<void> {
  assertSafeOcSingleArg(policyName, 'policyName');
  assertSafeOcSingleArg(namespace, 'namespace');
  const placementName = `${policyName}-placement`;
  await oc
    .execArgv(['delete', 'policy', policyName, '-n', namespace, '--ignore-not-found=true'])
    .catch(() => undefined);
  await oc
    .execArgv([
      'delete',
      'placementbinding',
      placementName,
      '-n',
      namespace,
      '--ignore-not-found=true',
    ])
    .catch(() => undefined);
  await oc
    .execArgv(['delete', 'placement', placementName, '-n', namespace, '--ignore-not-found=true'])
    .catch(() => undefined);
}

export async function waitForPolicyStatusCLI(
  oc: OcCliService,
  policyName: string,
  compliant: boolean | null,
  expectedClusterCount: number,
  timeoutMs = 120_000
): Promise<void> {
  assertSafeOcSingleArg(policyName, 'policyName');
  const namespace = 'default';
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const clusters = await oc.execArgv([
        'get',
        'policy',
        policyName,
        '-n',
        namespace,
        '-o',
        'jsonpath={range .status.status[*]}{.clustername}{" "}{end}',
      ]);
      const reported = clusters.trim().split(/\s+/).filter(Boolean);

      if (reported.length >= expectedClusterCount) {
        if (compliant === null) return;

        const overall = await oc.execArgv([
          'get',
          'policy',
          policyName,
          '-n',
          namespace,
          '-o',
          'jsonpath={.status.compliant}',
        ]);
        const clean = overall.trim();
        if (compliant && clean === 'Compliant') return;
        if (!compliant && clean === 'NonCompliant') return;
      }
    } catch {
      // Policy may not exist yet
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  const expected = compliant === null ? 'any' : compliant ? 'Compliant' : 'NonCompliant';
  throw new Error(
    `Policy ${policyName} did not reach ${expected} across ${expectedClusterCount} clusters within ${timeoutMs / 1000}s`
  );
}

export async function waitForPolicyCompliance(
  oc: OcCliService,
  policyName: string,
  namespace: string,
  expectedStatus: string,
  timeoutMs = 180_000
): Promise<void> {
  assertSafeOcSingleArg(policyName, 'policyName');
  assertSafeOcSingleArg(namespace, 'namespace');
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const status = await oc.execArgv([
        'get',
        'policy',
        policyName,
        '-n',
        namespace,
        '-o',
        'jsonpath={.status.compliant}',
      ]);
      if (status.trim() === expectedStatus) return;
    } catch {
      // Policy may not exist yet
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(
    `Policy ${policyName} did not reach ${expectedStatus} within ${timeoutMs / 1000}s`
  );
}

export type PolicyAction = 'Enable' | 'Disable' | 'Enforce' | 'Inform' | 'Delete';

export async function actionPolicyFromCLI(
  oc: OcCliService,
  name: string,
  action: PolicyAction,
  namespace = 'default'
): Promise<void> {
  assertSafeOcSingleArg(name, 'name');
  assertSafeOcSingleArg(namespace, 'namespace');

  const policyResource = 'policy.policy.open-cluster-management.io';
  let result: string;

  if (action === 'Delete') {
    result = await oc.execArgv(['delete', policyResource, name, '-n', namespace]);
    if (!result.includes('deleted')) throw new Error(`Failed to delete policy ${name}: ${result}`);
  } else {
    const patches: Record<Exclude<PolicyAction, 'Delete'>, string> = {
      Enable: '{"spec":{"disabled":false}}',
      Disable: '{"spec":{"disabled":true}}',
      Enforce: '{"spec":{"remediationAction":"enforce"}}',
      Inform: '{"spec":{"remediationAction":"inform"}}',
    };
    result = await oc.execArgv([
      'patch',
      policyResource,
      name,
      '-n',
      namespace,
      '--type',
      'merge',
      '-p',
      patches[action],
    ]);
    if (!result.includes('patched'))
      throw new Error(`Failed to ${action} policy ${name}: ${result}`);
  }
}

export async function verifyPolicyFromCLI(
  oc: OcCliService,
  name: string,
  namespace: string,
  expectations: {
    disabled?: boolean;
    remediation?: 'inform' | 'enforce';
    compliant?: string;
  },
  timeoutMs = 60_000
): Promise<void> {
  assertSafeOcSingleArg(name, 'name');
  assertSafeOcSingleArg(namespace, 'namespace');
  const pollInterval = 5_000;
  const start = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - start < timeoutMs) {
    try {
      const raw = await oc.execArgv([
        'get',
        'policies.policy.open-cluster-management.io',
        name,
        '-n',
        namespace,
        '-o',
        'json',
      ]);
      const policy = JSON.parse(raw);
      if (policy.metadata.name !== name) {
        throw new Error(`Policy name mismatch: expected ${name}, got ${policy.metadata.name}`);
      }
      if (expectations.disabled !== undefined && policy.spec.disabled !== expectations.disabled) {
        throw new Error(
          `Policy ${name} disabled state mismatch: expected ${expectations.disabled}, got ${policy.spec.disabled}`
        );
      }
      if (
        expectations.remediation !== undefined &&
        policy.spec.remediationAction !== expectations.remediation
      ) {
        throw new Error(
          `Policy ${name} remediation mismatch: expected ${expectations.remediation}, got ${policy.spec.remediationAction}`
        );
      }
      if (
        expectations.compliant !== undefined &&
        policy.status?.compliant !== expectations.compliant
      ) {
        throw new Error(
          `Policy ${name} compliance mismatch: expected ${expectations.compliant}, got ${policy.status?.compliant}`
        );
      }
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(
    `verifyPolicyFromCLI timed out after ${timeoutMs / 1000}s for ${namespace}/${name}: ${lastError?.message}`
  );
}

export async function checkPolicyStatusFromCLI(
  oc: OcCliService,
  policyName: string,
  namespace: string,
  expectedStatus: string,
  expectedMessage?: string
): Promise<void> {
  assertSafeOcSingleArg(policyName, 'policyName');
  assertSafeOcSingleArg(namespace, 'namespace');
  const status = await oc.execArgv([
    'get',
    'policy',
    policyName,
    '-n',
    namespace,
    '-o',
    'jsonpath={.status.compliant}',
  ]);
  const clean = status.trim();
  if (clean !== expectedStatus) {
    throw new Error(`Policy ${policyName} status is ${clean}, expected ${expectedStatus}`);
  }
  if (expectedMessage) {
    const details = await oc.execArgv(['get', 'policy', policyName, '-n', namespace, '-o', 'json']);
    if (!details.includes(expectedMessage)) {
      throw new Error(
        `Policy ${policyName} status details do not contain expected message: "${expectedMessage}"`
      );
    }
  }
}

export async function getOpenShiftClusterList(oc: OcCliService): Promise<string[]> {
  try {
    const result = await oc.execArgv([
      'get',
      'managedclusters',
      '-l',
      'vendor=OpenShift',
      '-o',
      'jsonpath={.items[*].metadata.name}',
    ]);
    return result.trim().split(/\s+/).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getAllClusterList(oc: OcCliService): Promise<string[]> {
  try {
    const result = await oc.execArgv([
      'get',
      'managedclusters',
      '-o',
      'jsonpath={.items[*].metadata.name}',
    ]);
    return result.trim().split(/\s+/).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getHubClusterName(oc: OcCliService): Promise<string> {
  try {
    const result = await oc.execArgv([
      'get',
      'managedclusters',
      '-l',
      'local-cluster=true',
      '-o',
      'jsonpath={.items[0].metadata.name}',
    ]);
    return result.trim();
  } catch {
    return '';
  }
}
