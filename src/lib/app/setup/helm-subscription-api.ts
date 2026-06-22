import fs from 'node:fs';
import path from 'node:path';

import { expect } from '@playwright/test';

import { withManagedClusterContext } from '@lib/cluster/managed-cluster-oc';
import type { OcCliService } from '@services/OcCliService';

const TEMPLATE_DIR = path.join(
  path.resolve(__dirname, '../../../..'),
  'src/templates/app/subscription-api'
);

function renderHelmApiYaml(templateFileName: string, clusterName: string): string {
  const raw = fs.readFileSync(path.join(TEMPLATE_DIR, templateFileName), 'utf8');
  return raw.replaceAll('{CLUSTER_NAME}', clusterName);
}

export async function applyHelmSubscriptionApiYaml(
  oc: OcCliService,
  templateFileName: 'helm-helloworld.yaml' | 'helm-multi.yaml',
  managedClusterName: string
): Promise<void> {
  const yaml = renderHelmApiYaml(templateFileName, managedClusterName);
  await oc.run(`oc apply -f - <<'EOF'\n${yaml}\nEOF`);
}

export async function expectHelmApplicationApiResourcesReady(
  oc: OcCliService,
  applicationName: string,
  namespace: string
): Promise<void> {
  await expect
    .poll(async () => {
      const apps = await oc.getNamespacedResourceList('applications.app', namespace).catch(() => '');
      return apps.includes(applicationName);
    }, { timeout: 180_000, intervals: [5_000, 10_000] })
    .toBe(true);

  await expect
    .poll(async () => {
      const subs = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
      return subs.includes(`${applicationName}-subscription-1`);
    }, { timeout: 180_000, intervals: [5_000, 10_000] })
    .toBe(true);

  await expect
    .poll(async () => {
      const placements = await oc.getNamespacedResourceList('placement', namespace).catch(() => '');
      return placements.includes(`${applicationName}-placement-1`);
    }, { timeout: 180_000, intervals: [5_000, 10_000] })
    .toBe(true);
}

export async function expectNamespaceDeployableResources(
  oc: OcCliService,
  namespace: string,
  resourceStem: string
): Promise<void> {
  for (const kind of ['service', 'deployment', 'replicaset', 'pod'] as const) {
    await expect
      .poll(async () => {
        const out = await oc.run(`oc get ${kind} -n ${namespace} --no-headers 2>/dev/null || true`);
        return out.includes(resourceStem);
      }, { timeout: 300_000, intervals: [5_000, 10_000] })
      .toBe(true);
  }
}

export async function expectManagedClusterRouteReady(
  oc: OcCliService,
  managedClusterName: string,
  namespace: string,
  routeName: string
): Promise<void> {
  await withManagedClusterContext(oc, managedClusterName, async () => {
    await expect
      .poll(async () => {
        const out = await oc.run(`oc get route -n ${namespace} --no-headers 2>/dev/null || true`);
        return out.includes(routeName);
      }, { timeout: 300_000, intervals: [5_000, 10_000] })
      .toBe(true);
  });
}

export async function deleteHelmApiApplicationResources(
  oc: OcCliService,
  applicationName: string,
  namespace: string
): Promise<void> {
  await oc.run(
    `oc delete application.app ${applicationName} -n ${namespace} --ignore-not-found; ` +
      `oc delete subscription ${applicationName}-subscription-1 -n ${namespace} --ignore-not-found; ` +
      `oc delete placement ${applicationName}-placement-1 -n ${namespace} --ignore-not-found`
  );
  const subs = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
  expect(subs.trim()).toBe('');
  const placements = await oc.getNamespacedResourceList('placement', namespace).catch(() => '');
  expect(placements.trim()).toBe('');
  await oc.deleteNamespace(namespace).catch(() => undefined);
}

export async function deleteHelmMultiApiSubscription(
  oc: OcCliService,
  applicationName: string,
  namespace: string,
  subscriptionIndex: 1 | 2
): Promise<void> {
  await oc.run(
    `oc delete subscription ${applicationName}-subscription-${subscriptionIndex} -n ${namespace} --ignore-not-found`
  );
  const subs = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
  expect(subs).not.toContain(`${applicationName}-subscription-${subscriptionIndex}`);
}

export async function deleteHelmMultiApplicationViaOc(
  oc: OcCliService,
  applicationName: string,
  namespace: string
): Promise<void> {
  await oc.run(
    `oc delete application.app ${applicationName} -n ${namespace} --ignore-not-found; ` +
      `oc delete subscription ${applicationName}-subscription-1 -n ${namespace} --ignore-not-found; ` +
      `oc delete placement ${applicationName}-placement-1 -n ${namespace} --ignore-not-found; ` +
      `oc delete subscription ${applicationName}-subscription-2 -n ${namespace} --ignore-not-found; ` +
      `oc delete placement ${applicationName}-placement-2 -n ${namespace} --ignore-not-found`
  );
  const subs = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
  expect(subs.trim()).toBe('');
  const placements = await oc.getNamespacedResourceList('placement', namespace).catch(() => '');
  expect(placements.trim()).toBe('');
  await oc.deleteNamespace(namespace).catch(() => undefined);
}
