import fs from 'node:fs';
import path from 'node:path';

import { expect } from '@playwright/test';

import { FLUX_LOCAL_REPOS } from '@constants/flux-local';
import type { CreateFluxApplicationOptions } from '@lib/app/flux/types';
import type { OcCliService } from '@services/OcCliService';

function repoRoot(): string {
  return path.resolve(__dirname, '../../../..');
}

function templatePath(relativePath: string): string {
  return path.join(repoRoot(), relativePath);
}

async function applyYamlString(oc: OcCliService, yaml: string): Promise<void> {
  await oc.run(`oc apply -f - <<'EOF'\n${yaml}\nEOF`);
}

async function deleteYamlString(oc: OcCliService, yaml: string): Promise<void> {
  await oc.run(`oc delete -f - <<'EOF'\n${yaml}\nEOF`);
}

function renderFluxGitYaml(spec: CreateFluxApplicationOptions): string {
  if (!spec.git) {
    throw new Error('renderFluxGitYaml: git path required');
  }
  const templateRel =
    spec.gitAppTemplateRelativePath ?? FLUX_LOCAL_REPOS.gitAppTemplateRelativePath;
  const raw = fs.readFileSync(templatePath(templateRel), 'utf8');
  return raw
    .replaceAll('{APP_NAME}', spec.applicationName)
    .replaceAll('{APP_NAMESPACE}', spec.namespace)
    .replaceAll('{APP_PATH}', spec.git.path);
}

function renderFluxHelmYaml(spec: CreateFluxApplicationOptions): string {
  if (!spec.helm) {
    throw new Error('renderFluxHelmYaml: helm chart required');
  }
  const templateRel =
    spec.helmAppTemplateRelativePath ?? FLUX_LOCAL_REPOS.helmAppTemplateRelativePath;
  const raw = fs.readFileSync(templatePath(templateRel), 'utf8');
  return raw
    .replaceAll('{APP_NAME}', spec.applicationName)
    .replaceAll('{APP_NAMESPACE}', spec.namespace)
    .replaceAll('{APP_CHART_NAME}', spec.helm.chartName)
    .replaceAll('{APP_PACKAGE_VERSION}', spec.helm.packageVersion);
}

/** Cypress `before()` — shared GitRepository + HelmRepository in flux-system. */
export async function applyFluxLocalRepos(oc: OcCliService): Promise<void> {
  await oc.applyYaml(templatePath(FLUX_LOCAL_REPOS.gitRepoRelativePath));
  await oc.applyYaml(templatePath(FLUX_LOCAL_REPOS.helmRepoRelativePath));
}

export async function applyFluxGitApp(
  oc: OcCliService,
  spec: CreateFluxApplicationOptions
): Promise<void> {
  await applyYamlString(oc, renderFluxGitYaml(spec));
  await oc.labelNamespaceForAlcTest(spec.namespace);
}

export async function deleteFluxGitApp(
  oc: OcCliService,
  spec: CreateFluxApplicationOptions
): Promise<void> {
  await deleteYamlString(oc, renderFluxGitYaml(spec));
}

export async function applyFluxHelmApp(
  oc: OcCliService,
  spec: CreateFluxApplicationOptions
): Promise<void> {
  await applyYamlString(oc, renderFluxHelmYaml(spec));
  await oc.labelNamespaceForAlcTest(spec.namespace);
}

export async function deleteFluxHelmApp(
  oc: OcCliService,
  spec: CreateFluxApplicationOptions
): Promise<void> {
  await deleteYamlString(oc, renderFluxHelmYaml(spec));
}

export async function applyFluxApp(
  oc: OcCliService,
  spec: CreateFluxApplicationOptions
): Promise<void> {
  if (spec.kind === 'git') {
    await applyFluxGitApp(oc, spec);
    return;
  }
  await applyFluxHelmApp(oc, spec);
}

export async function deleteFluxApp(
  oc: OcCliService,
  spec: CreateFluxApplicationOptions
): Promise<void> {
  if (spec.kind === 'git') {
    await deleteFluxGitApp(oc, spec);
    return;
  }
  await deleteFluxHelmApp(oc, spec);
}

async function withClusterContext<T>(
  oc: OcCliService,
  clusterName: string,
  fn: () => Promise<T>
): Promise<T> {
  const prior = await oc.getCurrentContext();
  try {
    await oc.useContext(clusterName);
    return await fn();
  } finally {
    await oc.useContext(prior);
  }
}

/** Cypress managed `before()` — GitRepository + HelmRepository on the managed cluster. */
export async function applyFluxReposOnCluster(
  oc: OcCliService,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () => applyFluxLocalRepos(oc));
}

export async function applyFluxAppOnCluster(
  oc: OcCliService,
  spec: CreateFluxApplicationOptions,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () => applyFluxApp(oc, spec));
}

export async function deleteFluxAppOnCluster(
  oc: OcCliService,
  spec: CreateFluxApplicationOptions,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () => deleteFluxApp(oc, spec));
}

/** Wait until primary deployment exists (minimal oc gate before UI assertions). */
export async function waitForFluxDeploymentReady(
  oc: OcCliService,
  namespace: string,
  deploymentName: string
): Promise<void> {
  await expect
    .poll(
      async () => {
        const out = await oc.run(
          `oc get deployment ${deploymentName} -n ${namespace} --no-headers 2>/dev/null || true`
        );
        return out.includes(deploymentName);
      },
      { timeout: 600_000, intervals: [5_000, 10_000] }
    )
    .toBe(true);
}

export async function waitForFluxDeploymentReadyOnCluster(
  oc: OcCliService,
  namespace: string,
  deploymentName: string,
  clusterName: string
): Promise<void> {
  await withClusterContext(oc, clusterName, () =>
    waitForFluxDeploymentReady(oc, namespace, deploymentName)
  );
}
