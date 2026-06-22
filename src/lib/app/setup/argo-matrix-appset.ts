import path from 'node:path';

import { expect } from '@playwright/test';

import { APP_ARGO_MATRIX_APPSET } from '@constants/app';
import { verifyArgoPushAppTopologyTab } from '@lib/app/verify/argo-push-topology-tab';
import { viewApplicationSetFromRowActions } from '@lib/app/verify/argo-appset-row-actions';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';

const MATRIX_YAML = path.join(
  path.resolve(__dirname, '../../../..'),
  APP_ARGO_MATRIX_APPSET.setupYamlRelativePath
);

/** RHACM4K-58916 hub matrix ApplicationSet YAML apply + managed-cluster deploy wait + UI topology. */
export async function prepareMatrixManagedClusterNamespaces(
  oc: OcCliService,
  managedClusterName: string,
  namespaces: readonly string[]
): Promise<void> {
  const prior = await oc.getCurrentContext();
  try {
    await oc.useContext(managedClusterName);
    for (const ns of namespaces) {
      await oc.createNamespaceIfNotExists(ns);
      await oc.run(
        `oc label namespace ${ns} argocd.argoproj.io/managed-by=openshift-gitops --overwrite`
      );
    }
  } finally {
    await oc.useContext(prior);
  }
}

export async function applyArgoMatrixAppsetSetup(oc: OcCliService): Promise<void> {
  await oc.applyYaml(MATRIX_YAML);
}

export async function cleanupArgoMatrixAppsetSetup(oc: OcCliService): Promise<void> {
  await oc.deleteYaml(MATRIX_YAML).catch(() => undefined);
}

export async function waitForMatrixDeployedNamespaces(
  oc: OcCliService,
  managedClusterName: string,
  namespaces: string[]
): Promise<void> {
  const prior = await oc.getCurrentContext();
  try {
    await oc.useContext(managedClusterName);
    for (const ns of namespaces) {
      await expect
        .poll(async () => {
          const svc = await oc.run(`oc get service -n ${ns} --no-headers 2>/dev/null || true`);
          const dep = await oc.run(`oc get deployment -n ${ns} --no-headers 2>/dev/null || true`);
          return svc.includes('helloworld-app-svc') && dep.includes('helloworld-app-deploy');
        }, { timeout: 300_000, intervals: [5_000, 10_000] })
        .toBe(true);
    }
  } finally {
    await oc.useContext(prior);
  }
}

export async function verifyArgoMatrixAppsetInUi(params: {
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  clusterName?: string;
}): Promise<void> {
  const { applicationListPage, applicationDetailsPage, clusterName = 'local-cluster' } = params;
  const { applicationSetName, argoServerNamespace, destinationNamespaces, clusterResources } =
    APP_ARGO_MATRIX_APPSET;

  await viewApplicationSetFromRowActions(
    applicationListPage,
    applicationDetailsPage,
    applicationSetName
  );
  await applicationDetailsPage.openDetailTab('topology');
  for (const destinationNamespace of destinationNamespaces) {
    await verifyArgoPushAppTopologyTab({
      page: applicationDetailsPage.getPage(),
      detailsPage: applicationDetailsPage,
      applicationSetName,
      argoServerNamespace,
      destinationNamespace,
      clusterResourceRows: [...clusterResources],
      clusterName,
      nodeHydrationTimeout: 300_000,
    });
  }
}
