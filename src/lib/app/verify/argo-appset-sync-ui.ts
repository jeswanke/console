import { expect } from '@playwright/test';
import path from 'node:path';

import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';

export const APP_ARGO_SYNC_TEST_59973 = {
  appsetName: 'test-appset-sync',
  appsetNamespace: 'openshift-gitops',
  placementName: 'test-appset-sync-placement',
  targetNamespace: 'test-appset-sync-ns',
  setupYamlRelativePath: 'src/templates/app/argo/test-appset-sync.yaml',
} as const;

/** RHACM4K-59973: oc apply fixture, wait for OutOfSync, sync via UI, poll Synced. */
export async function syncArgoPushApplicationSetFromDetails(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  projectRoot: string;
}): Promise<void> {
  const { oc, applicationListPage, applicationDetailsPage, projectRoot } = params;
  const { appsetName, appsetNamespace, placementName, targetNamespace, setupYamlRelativePath } =
    APP_ARGO_SYNC_TEST_59973;

  await oc.createNamespaceIfNotExists(targetNamespace);
  await oc.applyYaml(path.join(projectRoot, setupYamlRelativePath));

  await expect
    .poll(() => oc.getPlacementDecisionClusterCount(appsetNamespace, placementName), {
      timeout: 120_000,
      intervals: [2_000, 5_000, 10_000],
      message: `PlacementDecision ${placementName} must select at least 1 cluster`,
    })
    .toBeGreaterThan(0);

  const clusters = await oc.getPlacementDecisionClusterNames(appsetNamespace, placementName);
  const clusterName = clusters[0];
  const argoAppName = `${appsetName}-${clusterName}`;

  await expect
    .poll(() => oc.argoCdApplicationExists(appsetNamespace, argoAppName), {
      timeout: 300_000,
      intervals: [2_000, 5_000, 10_000],
      message: `Expected Argo CD Application ${appsetNamespace}/${argoAppName}`,
    })
    .toBe(true);

  await new Promise((resolve) => setTimeout(resolve, 10_000));

  const syncStatus = await oc.getArgoCdApplicationSyncStatus(appsetNamespace, argoAppName);
  if (syncStatus === 'Synced') {
    await oc.deleteArgoCdApplication(appsetNamespace, argoAppName);
    await expect
      .poll(() => oc.argoCdApplicationExists(appsetNamespace, argoAppName), {
        timeout: 300_000,
        intervals: [2_000, 5_000, 10_000],
        message: `Expected Argo CD Application ${appsetNamespace}/${argoAppName} to be recreated`,
      })
      .toBe(true);
  }

  await expect
    .poll(() => oc.getArgoCdApplicationSyncStatus(appsetNamespace, argoAppName), {
      timeout: 120_000,
      intervals: [2_000, 5_000],
    })
    .toBe('OutOfSync');

  const table = applicationListPage.applicationsTable;
  await applicationListPage.goto();
  await table.search(appsetName);
  const row = table.getRowByName(appsetName);
  await table.openRowActions(row);
  await table.clickViewApplicationMenuItem();
  await applicationDetailsPage.expectOnApplicationDetailsRoute();

  await applicationDetailsPage.syncArgoCdApplication();

  await expect
    .poll(() => oc.getArgoCdApplicationSyncStatus(appsetNamespace, argoAppName), {
      timeout: 120_000,
      intervals: [2_000, 5_000],
      message: `Expected Argo CD Application ${argoAppName} to reach Synced`,
    })
    .toBe('Synced');
}
