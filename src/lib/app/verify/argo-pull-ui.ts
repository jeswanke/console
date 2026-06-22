import { expect } from '@playwright/test';

import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import { expectApplicationDetailsMinSuccessResourceCount } from '@lib/app/verify/details-tab';
import { verifyArgoPushAppTopologyTab } from '@lib/app/verify/argo-push-topology-tab';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';

const STATUS_COLUMNS = ['healthStatus', 'syncStatus', 'podStatus'] as const;

export const APP_ARGO_PULL_TOPOLOGY_WARNINGS = {
  hubClusterNotSupported:
    'The ArgoCD pull model does not support the hub cluster as a destination cluster. Filter out the hub cluster from the placement resource.',
  localClusterNotSupported:
    'The ArgoCD pull model does not support local-cluster as a destination cluster. Filter out local-cluster from the placement resource.',
} as const;

/** Wait for MCASR Synced + Healthy on the managed cluster (Cypress pull-model backend checks). */
export async function waitForPullModelMcasrSyncedAndHealthy(
  oc: OcCliService,
  options: CreateArgoPushApplicationOptions,
  managedClusterName: string,
  pollOptions?: { timeout?: number }
): Promise<void> {
  const argoServerNamespace = options.applicationSetNamespace ?? options.argoServerLabel;
  const timeout = pollOptions?.timeout ?? 300_000;

  await expect
    .poll(
      () =>
        oc.getMulticlusterApplicationSetReportClusterSyncStatus(
          options.applicationName,
          argoServerNamespace,
          managedClusterName
        ),
      {
        timeout,
        intervals: [5_000, 10_000, 30_000],
        message: `MCASR sync status for "${options.applicationName}" on "${managedClusterName}"`,
      }
    )
    .toContain('Synced');

  await expect
    .poll(
      () =>
        oc.getMulticlusterApplicationSetReportClusterHealthStatus(
          options.applicationName,
          argoServerNamespace,
          managedClusterName
        ),
      {
        timeout,
        intervals: [5_000, 10_000, 30_000],
        message: `MCASR health status for "${options.applicationName}" on "${managedClusterName}"`,
      }
    )
    .toContain('Healthy');
}

/** Applications Overview table row for a pull-model ApplicationSet parent on the hub. */
export async function verifyArgoPullApplicationOverviewTable(params: {
  applicationListPage: ApplicationListPage;
  options: CreateArgoPushApplicationOptions;
  managedClusterName: string;
  assertStatusGreenCounts?: boolean;
}): Promise<void> {
  const {
    applicationListPage,
    options,
    managedClusterName,
    assertStatusGreenCounts = false,
  } = params;
  const table = applicationListPage.applicationsTable;
  const argoServerNamespace = options.applicationSetNamespace ?? options.argoServerLabel;

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  await table.search(options.applicationName);

  const row = table.getRowByName(options.applicationName);
  await expect(row).toBeVisible({ timeout: 120_000 });
  // ApplicationSet parent row shows the Argo server namespace, not the destination namespace
  // (Cypress `validateResourceTable` with `type: git` → `data.namespace` / openshift-gitops).
  await expect(table.getCellByLabel(row, 'namespace')).toContainText(argoServerNamespace);

  const clustersCell = table.getCellByLabel(row, 'clusters');
  await expect(clustersCell).toContainText('Remote');
  await expect(clustersCell.getByRole('link')).toHaveAttribute(
    'href',
    expect.stringContaining(managedClusterName)
  );

  if (!assertStatusGreenCounts) return;

  for (const columnKey of STATUS_COLUMNS) {
    const cell = table.getCellByLabel(row, columnKey);
    const greenLabel = cell.locator('[class*="c-label"][class*="pf-m-green"]');
    await expect(greenLabel).toContainText('1', { timeout: 120_000 });
  }
}

/** Open ApplicationSet details from the overview table name link. */
export async function openArgoPullApplicationFromOverviewTable(
  applicationListPage: ApplicationListPage,
  applicationSetName: string
): Promise<void> {
  const table = applicationListPage.applicationsTable;
  await applicationListPage.goto();
  await table.search(applicationSetName);
  const row = table.getRowByName(applicationSetName);
  await row.getByRole('link', { name: applicationSetName }).click();
}

/** Topology tab graph nodes for pull-model AppSet on a managed cluster. */
export async function verifyArgoPullApplicationTopology(params: {
  applicationDetailsPage: ApplicationDetailsPage;
  options: CreateArgoPushApplicationOptions;
  managedClusterName: string;
}): Promise<void> {
  const { applicationDetailsPage, options, managedClusterName } = params;
  const argoServerNamespace = options.applicationSetNamespace ?? options.argoServerLabel;
  const clusterResources = options.clusterResources ?? [];

  await applicationDetailsPage.openDetailTab('topology');
  await verifyArgoPushAppTopologyTab({
    page: applicationDetailsPage.getPage(),
    detailsPage: applicationDetailsPage,
    applicationSetName: options.applicationName,
    argoServerNamespace,
    destinationNamespace: options.destinationNamespace,
    clusterResourceRows: clusterResources,
    clusterName: managedClusterName,
  });

  if (options.successNumber) {
    await applicationDetailsPage.openDetailTab('details');
    await expectApplicationDetailsMinSuccessResourceCount(
      applicationDetailsPage,
      options.successNumber
    );
  }
}

/** RHACM4K-38202: hub-cluster ApplicationSet node shows pull-model placement warning. */
export async function verifyArgoPullHubTopologyWarning(
  applicationDetailsPage: ApplicationDetailsPage,
  applicationSetName: string,
  expectedWarning: string | RegExp,
  options?: { expectAbsent?: boolean }
): Promise<void> {
  await applicationDetailsPage.openDetailTab('topology');
  await applicationDetailsPage.expectTopologyGraphVisible();
  await applicationDetailsPage.clickTopologyGraphNodeByDataId(`application--${applicationSetName}`);

  const details = applicationDetailsPage.getPage().locator('.topologyDetails');
  if (options?.expectAbsent) {
    await expect(details).not.toContainText(expectedWarning);
  } else {
    await expect(details).toContainText(expectedWarning, { timeout: 30_000 });
  }
}
