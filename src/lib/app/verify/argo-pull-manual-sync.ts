import { expect } from '@playwright/test';

import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import { withManagedClusterContext } from '@lib/cluster/managed-cluster-oc';
import { viewApplicationSetFromRowActions } from '@lib/app/verify/argo-appset-row-actions';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';

import { pullModelTemplatePath } from '../argo-pull';
import { setupArgoPullDestinationNamespace } from '../argo-pull/setup-managed-destination-ns';

const MANUAL_SYNC_YAML = 'src/templates/app/argo/test-appset-pm-sync.yaml';

/** RHACM4K-60049: CLI AppSet → OutOfSync on managed cluster → console sync → Synced. */
export async function runArgoPullManualSyncScenario(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  options: CreateArgoPushApplicationOptions;
  managedClusterName: string;
}): Promise<void> {
  const { oc, applicationListPage, applicationDetailsPage, options, managedClusterName } = params;
  const argoServerNamespace = options.applicationSetNamespace ?? options.argoServerLabel;
  const { applicationName, destinationNamespace } = options;
  const argoAppName = `${applicationName}-${managedClusterName}`;

  await setupArgoPullDestinationNamespace(oc, managedClusterName, destinationNamespace);
  await oc.applyYaml(pullModelTemplatePath(MANUAL_SYNC_YAML));

  await withManagedClusterContext(oc, managedClusterName, async () => {
    await expect
      .poll(() => oc.argoCdApplicationExists(argoServerNamespace, argoAppName), {
        timeout: 300_000,
        intervals: [5_000, 10_000, 30_000],
        message: `Argo CD Application "${argoAppName}" on managed cluster`,
      })
      .toBe(true);

    await expect
      .poll(() => oc.getArgoCdApplicationSyncStatus(argoServerNamespace, argoAppName), {
        timeout: 120_000,
        intervals: [5_000, 10_000],
      })
      .toBe('OutOfSync');
  });

  await viewApplicationSetFromRowActions(
    applicationListPage,
    applicationDetailsPage,
    applicationName
  );
  await applicationDetailsPage.syncArgoCdApplication();

  await withManagedClusterContext(oc, managedClusterName, async () => {
    await expect
      .poll(() => oc.getArgoCdApplicationSyncStatus(argoServerNamespace, argoAppName), {
        timeout: 300_000,
        intervals: [5_000, 10_000, 30_000],
        message: `Argo CD Application "${argoAppName}" sync on managed cluster`,
      })
      .toBe('Synced');
  });
}

export async function cleanupArgoPullManualSyncScenario(
  oc: OcCliService,
  options: CreateArgoPushApplicationOptions,
  managedClusterName: string
): Promise<void> {
  await oc.deleteYaml(pullModelTemplatePath(MANUAL_SYNC_YAML)).catch(() => undefined);
  await withManagedClusterContext(oc, managedClusterName, async () => {
    await oc.run(`oc delete ns ${options.destinationNamespace} --ignore-not-found`);
  });
}
