import path from 'node:path';

import { expect } from '@playwright/test';

import type { OcCliService } from '@services/OcCliService';

const TEMPLATE_DIR = path.join(
  path.resolve(__dirname, '../../../..'),
  'src/templates/app/subscription-api'
);

const LONG_PREFIX_1 = path.join(TEMPLATE_DIR, 'git-long-prefix-1.yaml');
const LONG_PREFIX_2 = path.join(TEMPLATE_DIR, 'git-long-prefix-2.yaml');

/** RHACM4K-16864 — first long-prefix git subscription + shared channel namespace. */
export async function applyGitLongPrefixInitialFixtures(oc: OcCliService): Promise<void> {
  await oc.applyYaml(LONG_PREFIX_1);
  await oc.labelNamespaceForAlcTest('fo-monitoring-incluster');
  await oc.labelNamespaceForAlcTest('ns-ch');
}

export async function applyGitLongPrefixSecondSubscription(oc: OcCliService): Promise<void> {
  await oc.applyYaml(LONG_PREFIX_2);
}

/** Cypress waits for nginx + aerospike workloads in `fo-monitoring-incluster`. */
export async function waitForGitLongPrefixWorkloads(oc: OcCliService): Promise<void> {
  const namespace = 'fo-monitoring-incluster';
  const pollOpts = { timeout: 120_000, intervals: [5_000, 10_000] };

  await expect
    .poll(async () => {
      const dep = await oc.run(
        `oc get deployment -n ${namespace} --no-headers 2>/dev/null || true`
      );
      return dep.includes('nginx');
    }, pollOpts)
    .toBe(true);

  await expect
    .poll(async () => {
      const all = await oc.run(`oc get all -n ${namespace} --no-headers 2>/dev/null || true`);
      return all.includes('nginx') && all.includes('aerospike');
    }, pollOpts)
    .toBe(true);
}

export async function cleanupGitLongPrefixFixtures(oc: OcCliService): Promise<void> {
  await oc.deleteYaml(LONG_PREFIX_2).catch(() => undefined);
  await oc.deleteYaml(LONG_PREFIX_1).catch(() => undefined);
}
