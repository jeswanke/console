import { expect, type Locator } from '@playwright/test';

import { APP_FILTER } from '@constants/app';
import type { CreateOpenshiftApplicationOptions } from '@lib/app/openshift/types';
import { topologyApplicationDataId } from '@lib/app/topology/graph-ids';
import { expectApplicationRowAbsentInCurrentView } from '@lib/app/verify/applications-table-type-filter';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';

const LOCAL_CLUSTER = 'local-cluster';

/** Applications Overview — OpenShift row with namespace, cluster, and optional pod status. */
export async function verifyOpenshiftApplicationOverviewTable(params: {
  applicationListPage: ApplicationListPage;
  spec: CreateOpenshiftApplicationOptions;
  clusterName?: string;
  assertPodStatusGreen?: boolean;
  expectedPodStatusCount?: string;
}): Promise<void> {
  const {
    applicationListPage,
    spec,
    clusterName = spec.clusterName ?? LOCAL_CLUSTER,
    assertPodStatusGreen = false,
    expectedPodStatusCount = '1',
  } = params;
  const table = applicationListPage.applicationsTable;

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  await table.search(spec.applicationName);

  const row = table.getRowByName(spec.applicationName);
  await expect(row).toBeVisible({ timeout: 120_000 });
  await expect(table.getCellByLabel(row, 'namespace')).toContainText(spec.namespace);
  await expect(table.getCellByLabel(row, 'clusters')).toContainText(clusterName);
  await expect(table.getCellByLabel(row, 'type')).toContainText(APP_FILTER.typeOptions.openshift);

  if (assertPodStatusGreen) {
    const podCell = table.getCellByLabel(row, 'podStatus');
    await expect(podCell.locator('[class*="pf-m-green"]')).toContainText(expectedPodStatusCount, {
      timeout: 120_000,
    });
  }
}

/** OpenShift topology tab (`?apiVersion=ocp&cluster=…`). */
export async function verifyOpenshiftApplicationTopology(params: {
  applicationDetailsPage: ApplicationDetailsPage;
  spec: CreateOpenshiftApplicationOptions;
  clusterName?: string;
}): Promise<void> {
  const { applicationDetailsPage, spec, clusterName = spec.clusterName ?? LOCAL_CLUSTER } = params;
  const page = applicationDetailsPage.getPage();

  await applicationDetailsPage.gotoOpenshiftTopology(
    spec.namespace,
    spec.applicationName,
    clusterName
  );
  await applicationDetailsPage.expectTopologyGraphVisible();
  await expect(applicationDetailsPage.getApplicationHeading()).toHaveText(spec.applicationName);

  const surface = applicationDetailsPage.getTopologySurface();
  await expect(surface.locator(`[data-id="${topologyApplicationDataId(spec.applicationName)}"]`)).toBeVisible({
    timeout: 120_000,
  });

  for (const resourceType of spec.topologyIcons) {
    await expect(surface.locator(`#nodeIcon_${resourceType}`)).toBeVisible({ timeout: 120_000 });
  }

  await applicationDetailsPage.openDetailTab('details');
  await expect(applicationDetailsPage.getApplicationHeading()).toHaveText(spec.applicationName);

  const successLabels = page.locator('.pf-m-green [class*="c-label__content"], .pf-m-green[class*="c-label"]');
  await expect
    .poll(async () => largestNumericLabelInSuccessLabels(successLabels), {
      timeout: 300_000,
      intervals: [5_000, 10_000],
    })
    .toBeGreaterThanOrEqual(spec.successNumber);
}

async function largestNumericLabelInSuccessLabels(labels: Locator): Promise<number> {
  const texts = await labels.allTextContents();
  const values = texts.map((t) => parseInt(t.trim(), 10)).filter((n) => !Number.isNaN(n));
  return values.length > 0 ? Math.max(...values) : 0;
}

/** Table + topology after OpenShift app deploy/reconcile. */
export async function verifyOpenshiftApplicationInUi(params: {
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  spec: CreateOpenshiftApplicationOptions;
  clusterName?: string;
}): Promise<void> {
  await verifyOpenshiftApplicationOverviewTable(params);
  await verifyOpenshiftApplicationTopology(params);
}

/** After resource delete — application row disappears from Overview table. */
export async function verifyOpenshiftApplicationRemovedFromTable(params: {
  applicationListPage: ApplicationListPage;
  applicationName: string;
}): Promise<void> {
  const { applicationListPage, applicationName } = params;
  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  await applicationListPage.applicationsTable.search(applicationName);
  await expectApplicationRowAbsentInCurrentView(
    applicationListPage.applicationsTable,
    applicationName,
    120_000
  );
}
