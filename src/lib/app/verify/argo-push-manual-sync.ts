import { expect } from '@playwright/test';

import { createArgoPushApplicationIfMissing } from '@lib/app/argo-push';
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import { verifyArgoPushAppTopologyTab } from '@lib/app/verify/argo-push-topology-tab';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import type { OcCliService } from '@services/OcCliService';

/** RHACM4K-61942: wizard create with manual sync → Topology OutOfSync → Details sync → topology deployed. */
export async function runArgoPushManualSyncScenario(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  argoPushApplicationCreateWizardPage: ArgoPushApplicationCreateWizardPage;
  argoPush: CreateArgoPushApplicationOptions;
  clusterName?: string;
}): Promise<void> {
  const {
    oc,
    applicationListPage,
    applicationDetailsPage,
    argoPushApplicationCreateWizardPage: wizard,
    argoPush,
    clusterName = 'local-cluster',
  } = params;
  const argoServerNamespace = argoPush.applicationSetNamespace ?? argoPush.argoServerLabel;
  const argoAppName = `${argoPush.applicationName}-${clusterName}`;

  await createArgoPushApplicationIfMissing(oc, applicationListPage, wizard, {
    ...argoPush,
    disableAutomatedSync: true,
    postCreateWaitMs: argoPush.postCreateWaitMs ?? 180_000,
  });

  const table = applicationListPage.applicationsTable;
  await applicationListPage.goto();
  await table.search(argoPush.applicationName);
  await table.openRowActions(table.getRowByName(argoPush.applicationName));
  await table.clickViewApplicationMenuItem();
  await applicationDetailsPage.expectOnApplicationDetailsRoute();

  await applicationDetailsPage.openDetailTab('topology');
  await applicationDetailsPage.expectTopologyGraphVisible();
  await applicationDetailsPage.clickTopologyGraphNodeByDataId(`application--${argoAppName}`);
  await applicationDetailsPage.expectVisibleTopologyDrawerContains(/OutOfSync/i);

  await applicationDetailsPage.openDetailTab('details');
  await applicationDetailsPage.syncArgoCdApplication();

  await expect
    .poll(() => oc.getArgoCdApplicationSyncStatus(argoServerNamespace, argoAppName), {
      timeout: 300_000,
      intervals: [5_000, 10_000, 30_000],
    })
    .toBe('Synced');

  if (argoPush.clusterResources?.length) {
    await applicationDetailsPage.openDetailTab('topology');
    await verifyArgoPushAppTopologyTab({
      page: applicationDetailsPage.getPage(),
      detailsPage: applicationDetailsPage,
      applicationSetName: argoPush.applicationName,
      argoServerNamespace,
      destinationNamespace: argoPush.destinationNamespace,
      clusterResourceRows: argoPush.clusterResources,
      clusterName,
    });
  }
}
