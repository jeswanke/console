import fs from 'node:fs';
import path from 'node:path';

import { expect } from '@playwright/test';

import type { CreateOpenshiftApplicationOptions } from '@lib/app/openshift/types';
import { withManagedClusterContext } from '@lib/cluster/managed-cluster-oc';
import type { OcCliService } from '@services/OcCliService';

const DEFAULT_HELLOWORLD_TEMPLATE = 'src/templates/app/openshift/git-helloworld.yaml';
const DEFAULT_MORTGAGE_TEMPLATE = 'src/templates/app/openshift/git-mortgage.yaml';

function repoRoot(): string {
  return path.resolve(__dirname, '../../../..');
}

function templatePath(relativePath: string): string {
  return path.join(repoRoot(), relativePath);
}

async function applyYamlFile(oc: OcCliService, relativePath: string): Promise<void> {
  await oc.applyYaml(templatePath(relativePath));
}

async function deleteYamlFile(oc: OcCliService, relativePath: string): Promise<void> {
  const yaml = fs.readFileSync(templatePath(relativePath), 'utf8');
  await oc.run(`oc delete --ignore-not-found -f - <<'EOF'\n${yaml}\nEOF`);
}

function helloworldTemplate(spec: CreateOpenshiftApplicationOptions): string {
  return spec.helloworldTemplateRelativePath ?? DEFAULT_HELLOWORLD_TEMPLATE;
}

function mortgageTemplate(spec: CreateOpenshiftApplicationOptions): string {
  return spec.mortgageTemplateRelativePath ?? DEFAULT_MORTGAGE_TEMPLATE;
}

/** Cypress `oc apply -f git-helloworld.yaml`. */
export async function applyOpenshiftHelloworldApp(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions
): Promise<void> {
  await applyYamlFile(oc, helloworldTemplate(spec));
  await oc.labelNamespaceForAlcTest(spec.namespace);
}

/** Cypress `oc apply -f git-mortgage.yaml` (part-of edit). */
export async function applyOpenshiftMortgageApp(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions
): Promise<void> {
  await applyYamlFile(oc, mortgageTemplate(spec));
}

export async function deleteOpenshiftHelloworldApp(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions
): Promise<void> {
  await deleteYamlFile(oc, helloworldTemplate(spec));
}

export async function deleteOpenshiftMortgageApp(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions
): Promise<void> {
  await deleteYamlFile(oc, mortgageTemplate(spec));
}

export async function deleteOpenshiftNamespace(
  oc: OcCliService,
  namespace: string
): Promise<void> {
  await oc.deleteNamespace(namespace).catch(() => undefined);
}

async function withClusterContext<T>(
  oc: OcCliService,
  clusterName: string,
  fn: () => Promise<T>
): Promise<T> {
  return withManagedClusterContext(oc, clusterName, fn);
}

export async function applyOpenshiftHelloworldAppOnCluster(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () => applyOpenshiftHelloworldApp(oc, spec));
}

export async function applyOpenshiftMortgageAppOnCluster(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () => applyOpenshiftMortgageApp(oc, spec));
}

export async function deleteOpenshiftHelloworldAppOnCluster(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () => deleteOpenshiftHelloworldApp(oc, spec));
}

export async function deleteOpenshiftMortgageAppOnCluster(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () => deleteOpenshiftMortgageApp(oc, spec));
}

/** Poll until deployment, replicaset, service, and route exist (Cypress waitUntil parity). */
export async function waitForOpenshiftAppResourcesReady(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions,
  options?: { deploymentName?: string }
): Promise<void> {
  const deploymentName = options?.deploymentName ?? spec.deployment;
  const poll = { timeout: 180_000, intervals: [5_000, 10_000] as number[] };

  await expect
    .poll(async () => {
      const out = await oc.run(`oc get deployment -n ${spec.namespace} --no-headers 2>/dev/null || true`);
      return out.includes(deploymentName);
    }, poll)
    .toBe(true);

  await expect
    .poll(async () => {
      const out = await oc.run(`oc get replicaset -n ${spec.namespace} --no-headers 2>/dev/null || true`);
      return out.includes(deploymentName);
    }, poll)
    .toBe(true);

  await expect
    .poll(async () => {
      const out = await oc.run(`oc get service -n ${spec.namespace} --no-headers 2>/dev/null || true`);
      return out.includes(spec.service);
    }, poll)
    .toBe(true);

  if (spec.route) {
    await expect
      .poll(async () => {
        const out = await oc.run(`oc get route -n ${spec.namespace} --no-headers 2>/dev/null || true`);
        return out.includes(spec.route!);
      }, poll)
      .toBe(true);
  }
}

export async function waitForOpenshiftAppResourcesReadyOnCluster(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions,
  clusterName: string,
  options?: { deploymentName?: string }
): Promise<void> {
  await withClusterContext(oc, clusterName, () =>
    waitForOpenshiftAppResourcesReady(oc, spec, options)
  );
}

/** Cypress `oc get … should('not.contain', …)` after delete. */
export async function expectOpenshiftAppResourcesAbsent(
  oc: OcCliService,
  spec: CreateOpenshiftApplicationOptions
): Promise<void> {
  const deploymentName = spec.deployment;
  for (const [kind, stem] of [
    ['deployment', deploymentName],
    ['route', spec.route ?? ''],
    ['service', spec.service],
    ['replicaset', deploymentName],
  ] as const) {
    if (!stem) continue;
    const out = await oc.run(`oc get ${kind} -n ${spec.namespace} 2>/dev/null || true`);
    expect(out).not.toContain(stem);
  }
}

export async function deleteOpenshiftNamespaceOnCluster(
  oc: OcCliService,
  namespace: string,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () => deleteOpenshiftNamespace(oc, namespace));
}

/** Cypress `requireCreate()` — skip apply on `@post-restore` / `@post-upgrade` grep runs. */
export function shouldCreateOpenshiftResourcesForRestore(tags: readonly string[]): boolean {
  const joined = tags.join(' ');
  return !joined.includes('@post-restore') && !joined.includes('@post-upgrade');
}
