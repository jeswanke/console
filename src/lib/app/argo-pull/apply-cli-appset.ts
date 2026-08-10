import fs from 'node:fs';

import { expect } from '@playwright/test';

import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import type { OcCliService } from '@services/OcCliService';

import { pullModelTemplatePath } from './index';

const APP_SET_TEMPLATE = 'src/templates/app/argo/argocd-pm-include-local-git-template.yaml';
const PLACEMENT_EXCLUDE_TEMPLATE = 'src/templates/app/argo/placement_exclude_local_cluster.yaml';

function substituteAppSetTemplate(
  raw: string,
  options: CreateArgoPushApplicationOptions,
  argoServerNamespace: string
): string {
  const { applicationName, destinationNamespace, git } = options;
  if (!git?.url || !git.path) {
    throw new Error('applyPullModelIncludeLocalGitAppSet: git url and path are required');
  }
  return raw
    .replaceAll('{APP_SET_NAME}', applicationName)
    .replaceAll('{APP_SET_URL}', git.url)
    .replaceAll('{APP_SET_PATH}', git.path)
    .replaceAll('{APP_SET_DEPLOYED_NAMESPACE}', destinationNamespace)
    .replaceAll('{APP_SET_NAMESPACE}', argoServerNamespace)
    .replaceAll('{APP_SET_SELF_HEAL}', 'true')
    .replaceAll('{APP_SET_PRUNE}', 'true');
}

function substitutePlacementExcludeTemplate(
  raw: string,
  applicationName: string,
  argoServerNamespace: string
): string {
  return raw
    .replaceAll('{APP_SET_NAME}', applicationName)
    .replaceAll('{APP_SET_NAMESPACE}', argoServerNamespace);
}

/** RHACM4K-38202: hub CLI apply for pull-model AppSet including local-cluster placement. */
export async function applyPullModelIncludeLocalGitAppSet(
  oc: OcCliService,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const argoServerNamespace = options.applicationSetNamespace ?? options.argoServerLabel;
  const placementName = `${options.applicationName}-placement`;
  const raw = fs.readFileSync(pullModelTemplatePath(APP_SET_TEMPLATE), 'utf8');
  const yaml = substituteAppSetTemplate(raw, options, argoServerNamespace);
  await oc.run(`oc apply -f - <<'EOF'\n${yaml}\nEOF`);

  // AppSet + Placement are applied together; wait for PlacementDecision before MCASR polling.
  await expect
    .poll(() => oc.getPlacementDecisionClusterCount(argoServerNamespace, placementName), {
      timeout: 90_000,
      intervals: [2_000, 5_000, 10_000],
      message: `PlacementDecision ${placementName} before ApplicationSet generation`,
    })
    .toBeGreaterThan(0);
}

/** RHACM4K-38202: patch placement to exclude local-cluster from pull-model AppSet. */
export async function applyPullModelPlacementExcludeLocalCluster(
  oc: OcCliService,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const argoServerNamespace = options.applicationSetNamespace ?? options.argoServerLabel;
  const raw = fs.readFileSync(pullModelTemplatePath(PLACEMENT_EXCLUDE_TEMPLATE), 'utf8');
  const yaml = substitutePlacementExcludeTemplate(
    raw,
    options.applicationName,
    argoServerNamespace
  );
  await oc.run(`oc apply -f - <<'EOF'\n${yaml}\nEOF`);
}

export async function isLocalClusterInPlacementDecision(
  oc: OcCliService,
  options: CreateArgoPushApplicationOptions
): Promise<boolean> {
  const argoServerNamespace = options.applicationSetNamespace ?? options.argoServerLabel;
  const placementName = `${options.applicationName}-placement`;
  const clusters = await oc.getPlacementDecisionClusterNames(argoServerNamespace, placementName);
  return clusters.includes('local-cluster');
}

/** RHACM4K-38202 cleanup: delete hub ApplicationSet + Placement and unblock local-cluster app removal. */
export async function cleanupPullModelIncludeLocalGitAppSet(
  oc: OcCliService,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const argoServerNamespace = options.applicationSetNamespace ?? options.argoServerLabel;
  await oc.deleteApplicationSet(argoServerNamespace, options.applicationName);
  await oc.deleteApplicationPlacementsInNamespace(argoServerNamespace, options.applicationName);
  await oc.removeArgoCdApplicationSkipReconcileAnnotation(
    argoServerNamespace,
    `${options.applicationName}-local-cluster`
  );
}
