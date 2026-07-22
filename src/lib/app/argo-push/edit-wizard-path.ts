import { expect } from '@playwright/test';

import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import { createArgoPushApplicationIfMissing } from '@lib/app/argo-push';
import { verifyArgoPushAppTopologyTab } from '@lib/app/verify/argo-push-topology-tab';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import type { OcCliService } from '@services/OcCliService';

/** RHACM4K-6735 / RHACM4K-6773: edit Git path via push wizard and verify topology. */
export async function editArgoPushApplicationGitPathAndVerifyTopology(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  wizard: ArgoPushApplicationCreateWizardPage;
  argoPush: CreateArgoPushApplicationOptions;
  newGitPath: string;
  clusterName?: string;
}): Promise<void> {
  const {
    oc,
    applicationListPage,
    applicationDetailsPage,
    wizard,
    argoPush,
    newGitPath,
    clusterName = 'local-cluster',
  } = params;
  const argoServerNamespace = argoPush.applicationSetNamespace ?? argoPush.argoServerLabel;
  const argoAppName = `${argoPush.applicationName}-${clusterName}`;
  const page = applicationDetailsPage.getPage();

  await createArgoPushApplicationIfMissing(oc, applicationListPage, wizard, argoPush);

  await wizard.openEditFromApplicationsList(applicationListPage, argoPush.applicationName);
  await wizard.clickTemplateWizardStep();
  await wizard.pickGitPathOption(newGitPath);
  await wizard.advanceFromTemplateThroughSubmit();

  await new Promise((resolve) => setTimeout(resolve, 30_000));

  await applicationDetailsPage.gotoApplicationSet(argoServerNamespace, argoPush.applicationName, 'details');
  await applicationDetailsPage.syncArgoCdApplication({ timeout: 120_000 });

  await expect
    .poll(() => oc.getArgoCdApplicationSyncStatus(argoServerNamespace, argoAppName), {
      timeout: 300_000,
      intervals: [5_000, 10_000],
    })
    .toBe('Synced');

  if (argoPush.clusterResources?.length) {
    await applicationDetailsPage.openDetailTab('topology');
    await verifyArgoPushAppTopologyTab({
      page,
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
