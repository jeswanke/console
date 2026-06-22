import fs from 'node:fs';
import path from 'node:path';

import { expect } from '@playwright/test';

import { createArgoPushApplicationIfMissing, recreateArgoPushApplication } from '@lib/app/argo-push';
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import { verifyArgoPushAppTopologyTab } from '@lib/app/verify/argo-push-topology-tab';
import { viewApplicationSetFromRowActions } from '@lib/app/verify/argo-appset-row-actions';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import type { OcCliService } from '@services/OcCliService';

const MSA_NAME = 'application-manager';
const GITOPS_NS = 'openshift-gitops';
const MSA_TEMPLATE_REL = 'src/templates/app/argo/managed-service-account-template.yaml';

function gitOpsClusterSecretName(clusterName: string): string {
  return `${clusterName}-${MSA_NAME}-cluster-secret`;
}

async function waitForManagedServiceAccount(oc: OcCliService, clusterName: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const out = await oc.run(
          `oc get managedserviceaccount ${MSA_NAME} -n ${clusterName} --no-headers 2>/dev/null || true`
        );
        return out.includes(MSA_NAME);
      },
      { timeout: 180_000, intervals: [5_000] }
    )
    .toBe(true);
}

async function readMsaBearerToken(oc: OcCliService, clusterName: string): Promise<string> {
  const secretName = (
    await oc.run(
      `oc get managedserviceaccount ${MSA_NAME} -n ${clusterName} -o jsonpath='{.status.tokenSecretRef.name}'`
    )
  ).trim();
  expect(secretName.length).toBeGreaterThan(0);
  const token = (
    await oc.run(
      `oc get secret ${secretName} -n ${clusterName} -o jsonpath='{.data.token}' | base64 --decode`
    )
  ).trim();
  expect(token.length).toBeGreaterThan(0);
  return token;
}

async function readGitOpsClusterSecretBearerToken(
  oc: OcCliService,
  clusterName: string
): Promise<string> {
  const secretName = gitOpsClusterSecretName(clusterName);
  await expect
    .poll(
      async () => {
        const out = await oc.run(
          `oc get secret ${secretName} -n ${GITOPS_NS} --no-headers 2>/dev/null || true`
        );
        return out.includes(secretName);
      },
      { timeout: 180_000, intervals: [5_000] }
    )
    .toBe(true);
  const token = (
    await oc.run(
      `oc get secret ${secretName} -n ${GITOPS_NS} -o jsonpath='{.data.config}' | base64 --decode | jq -r '.bearerToken'`
    )
  ).trim();
  expect(token.length).toBeGreaterThan(0);
  return token;
}

/** Assert ManagedServiceAccount token matches openshift-gitops cluster secret bearer token. */
export async function assertApplicationManagerTokensMatch(
  oc: OcCliService,
  clusterName: string
): Promise<void> {
  await waitForManagedServiceAccount(oc, clusterName);
  const msaToken = await readMsaBearerToken(oc, clusterName);
  const gitOpsToken = await readGitOpsClusterSecretBearerToken(oc, clusterName);
  expect(msaToken).toBe(gitOpsToken);
}

export async function applyManagedServiceAccountTemplate(
  oc: OcCliService,
  clusterName: string,
  repoRoot: string
): Promise<void> {
  const templatePath = path.join(repoRoot, MSA_TEMPLATE_REL);
  const yaml = fs
    .readFileSync(templatePath, 'utf8')
    .replaceAll('{MANAGED_CLUSTER_NAMESPACE}', clusterName);
  await oc.run(`oc apply -f - <<'EOF'\n${yaml}\nEOF`);
}

export async function deleteManagedServiceAccount(
  oc: OcCliService,
  clusterName: string
): Promise<void> {
  await oc.run(
    `oc delete managedserviceaccount ${MSA_NAME} -n ${clusterName} --ignore-not-found`
  );
}

function buildLongLivedSecretOptions(
  base: CreateArgoPushApplicationOptions,
  applicationName: string,
  clusterName: string
): CreateArgoPushApplicationOptions {
  const gitPath = base.git?.path ?? 'helloworld-argo';
  return {
    ...base,
    applicationName,
    destinationNamespace: `${applicationName}-ns`,
    git: base.git ? { ...base.git, path: gitPath } : base.git,
    placementLabelExpression: {
      labelName: 'name',
      labelValues: [clusterName],
    },
  };
}

async function verifyLongLivedSecretAppsetUi(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  argoPush: CreateArgoPushApplicationOptions;
  clusterName: string;
}): Promise<void> {
  const { applicationListPage, applicationDetailsPage, argoPush, clusterName } = params;
  const argoServerNamespace = argoPush.applicationSetNamespace ?? argoPush.argoServerLabel;

  await viewApplicationSetFromRowActions(
    applicationListPage,
    applicationDetailsPage,
    argoPush.applicationName
  );
  await applicationDetailsPage.openDetailTab('topology');
  if (argoPush.clusterResources?.length) {
    await verifyArgoPushAppTopologyTab({
      page: applicationDetailsPage.getPage(),
      detailsPage: applicationDetailsPage,
      applicationSetName: argoPush.applicationName,
      argoServerNamespace,
      destinationNamespace: argoPush.destinationNamespace,
      clusterResourceRows: argoPush.clusterResources,
      clusterName,
      nodeHydrationTimeout: 300_000,
    });
  }
}

/** RHACM4K-54897: token parity, wizard AppSet, UI topology, destructive GitOps teardown. */
export async function runLongLivedSecret54897Scenario(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  argoPushApplicationCreateWizardPage: ArgoPushApplicationCreateWizardPage;
  argoPush: CreateArgoPushApplicationOptions;
  clusterName: string;
}): Promise<void> {
  const {
    oc,
    applicationListPage,
    applicationDetailsPage,
    argoPushApplicationCreateWizardPage: wizard,
    argoPush: base,
    clusterName,
  } = params;
  const argoPush = buildLongLivedSecretOptions(base, 'rhacm4k-54897', clusterName);
  const argoServer = argoPush.argoServerLabel;

  await oc.labelManagedCluster(clusterName, 'name', clusterName);
  await assertApplicationManagerTokensMatch(oc, clusterName);

  await createArgoPushApplicationIfMissing(oc, applicationListPage, wizard, argoPush);
  await verifyLongLivedSecretAppsetUi({
    oc,
    applicationListPage,
    applicationDetailsPage,
    argoPush,
    clusterName,
  });

  await oc.run(`oc delete managedclustersetbindings -n ${GITOPS_NS} global --ignore-not-found`);
  await oc.run(`oc delete placement -n ${GITOPS_NS} ${argoServer}-placement --ignore-not-found`);
  await oc.run(`oc delete gitopscluster -n ${GITOPS_NS} ${argoServer} --ignore-not-found`);
  await oc.deleteApplicationSet(GITOPS_NS, argoPush.applicationName);
  await oc.deleteNamespace(argoPush.destinationNamespace);
}

/** RHACM4K-54902: AppSet UI, delete/recreate MSA, token parity, UI re-verify. */
export async function runLongLivedSecret54902Scenario(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  argoPushApplicationCreateWizardPage: ArgoPushApplicationCreateWizardPage;
  argoPush: CreateArgoPushApplicationOptions;
  clusterName: string;
  repoRoot: string;
}): Promise<void> {
  const {
    oc,
    applicationListPage,
    applicationDetailsPage,
    argoPushApplicationCreateWizardPage: wizard,
    argoPush: base,
    clusterName,
    repoRoot,
  } = params;
  const argoPush = buildLongLivedSecretOptions(base, 'rhacm4k-54902', clusterName);

  await oc.labelManagedCluster(clusterName, 'name', clusterName);

  await recreateArgoPushApplication(oc, applicationListPage, wizard, argoPush);
  await verifyLongLivedSecretAppsetUi({
    oc,
    applicationListPage,
    applicationDetailsPage,
    argoPush,
    clusterName,
  });

  await deleteManagedServiceAccount(oc, clusterName);
  await applyManagedServiceAccountTemplate(oc, clusterName, repoRoot);
  await new Promise((resolve) => setTimeout(resolve, 600_000));

  await assertApplicationManagerTokensMatch(oc, clusterName);
  await verifyLongLivedSecretAppsetUi({
    oc,
    applicationListPage,
    applicationDetailsPage,
    argoPush,
    clusterName,
  });

  await oc.deleteApplicationSet(GITOPS_NS, argoPush.applicationName);
  await oc.deleteNamespace(argoPush.destinationNamespace);
}
