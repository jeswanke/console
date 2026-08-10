import { expect, type Page } from '@playwright/test';

import { FLUX_LOCAL_CLUSTER } from '@constants/flux-local';
import type { CreateFluxApplicationOptions } from '@lib/app/flux/types';
import { topologyApplicationDataId } from '@lib/app/topology/graph-ids';
import { expectApplicationRowAbsentInCurrentView } from '@lib/app/verify/applications-table-type-filter';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';

/** Applications Overview — row visible with Flux type, namespace, and local cluster. */
export async function verifyFluxApplicationOverviewTable(params: {
  applicationListPage: ApplicationListPage;
  spec: CreateFluxApplicationOptions;
  clusterName?: string;
  assertPodStatusGreen?: boolean;
}): Promise<void> {
  const {
    applicationListPage,
    spec,
    clusterName = spec.clusterName ?? FLUX_LOCAL_CLUSTER,
    assertPodStatusGreen = true,
  } = params;
  const table = applicationListPage.applicationsTable;

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  await table.search(spec.applicationName);

  const row = table.getRowByName(spec.applicationName);
  await expect(row).toBeVisible({ timeout: 120_000 });
  await expect(table.getCellByLabel(row, 'namespace')).toContainText(spec.namespace);
  await expect(table.getCellByLabel(row, 'clusters')).toContainText(clusterName);
  await expect(table.getCellByLabel(row, 'type')).toContainText(/flux/i);

  if (assertPodStatusGreen) {
    const podCell = table.getCellByLabel(row, 'podStatus');
    await expect(podCell.locator('[class*="pf-m-green"]')).toBeVisible({ timeout: 120_000 });
  }
}

/** Flux topology tab — application node + deployable icon nodes (Cypress `validateDeployables`). */
export async function verifyFluxApplicationTopology(params: {
  applicationDetailsPage: ApplicationDetailsPage;
  page: Page;
  spec: CreateFluxApplicationOptions;
  clusterName?: string;
}): Promise<void> {
  const {
    applicationDetailsPage,
    page,
    spec,
    clusterName = spec.clusterName ?? FLUX_LOCAL_CLUSTER,
  } = params;

  await applicationDetailsPage.gotoFluxTopology(spec.namespace, spec.applicationName, clusterName);
  await applicationDetailsPage.expectTopologyGraphVisible();
  await expect(applicationDetailsPage.getApplicationHeading()).toHaveText(spec.applicationName);

  const surface = applicationDetailsPage.getTopologySurface();
  await expect(
    surface.locator(`[data-id="${topologyApplicationDataId(spec.applicationName)}"]`)
  ).toBeVisible({
    timeout: 120_000,
  });

  for (const resourceType of spec.topologyIcons) {
    await expect(surface.locator(`use[href="#nodeIcon_${resourceType}"]`).first()).toBeVisible({
      timeout: 120_000,
    });
  }

  await applicationDetailsPage.openDetailTab('details');
  await expect(applicationDetailsPage.getApplicationHeading()).toHaveText(spec.applicationName);

  const successLabels = page.locator(
    '.pf-m-green [class*="c-label__content"], .pf-m-green[class*="c-label"]'
  );
  await expect
    .poll(async () => successLabels.count(), { timeout: 300_000, intervals: [5_000, 10_000] })
    .toBeGreaterThanOrEqual(1);
}

/** Table + topology UI verification after Flux app deploy/reconcile. */
export async function verifyFluxApplicationInUi(params: {
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  page: Page;
  spec: CreateFluxApplicationOptions;
  clusterName?: string;
}): Promise<void> {
  await verifyFluxApplicationOverviewTable(params);
  await verifyFluxApplicationTopology(params);
}

/** After Flux CR delete — application row disappears from Overview table. */
export async function verifyFluxApplicationRemovedFromTable(params: {
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
