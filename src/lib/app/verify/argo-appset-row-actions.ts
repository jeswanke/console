import { expect } from '@playwright/test';

import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';

/** Applications table → row **Actions** → **View**; assert details route and heading. */
export async function viewApplicationSetFromRowActions(
  applicationListPage: ApplicationListPage,
  applicationDetailsPage: ApplicationDetailsPage,
  applicationSetName: string
): Promise<void> {
  const table = applicationListPage.applicationsTable;
  await applicationListPage.goto();
  await table.search(applicationSetName);
  const row = table.getRowByName(applicationSetName);
  await row.waitFor({ state: 'visible', timeout: 60_000 });
  await table.openRowActions(row);
  await table.clickViewApplicationMenuItem();
  await applicationDetailsPage.expectOnApplicationDetailsRoute();
  await expect(applicationDetailsPage.getApplicationHeading()).toHaveText(applicationSetName);
}

/** Row **Actions** → **Search**; assert global search URL and label chips. */
export async function searchApplicationSetFromRowActions(
  applicationListPage: ApplicationListPage,
  applicationSetName: string,
  applicationSetNamespace: string
): Promise<void> {
  const table = applicationListPage.applicationsTable;
  await applicationListPage.goto();
  await table.search(applicationSetName);
  const row = table.getRowByName(applicationSetName);
  await table.openRowActions(row);
  await table.clickSearchApplicationMenuItem();
  await expect(applicationListPage.getPage()).toHaveURL(/\/multicloud\/search/);
  const labels = applicationListPage.getPage().locator('[class*="label-group__list-item"]');
  await expect(labels.filter({ hasText: `name:${applicationSetName}` })).toBeVisible({ timeout: 60_000 });
  await expect(labels.filter({ hasText: `namespace:${applicationSetNamespace}` })).toBeVisible();
  await expect(labels.filter({ hasText: 'kind:applicationset' })).toBeVisible();
  await expect(labels.filter({ hasText: 'apigroup:argoproj.io' })).toBeVisible();
  await expect(labels.filter({ hasText: 'apiversion:v1alpha1' })).toBeVisible();
}

/** Row **Actions** → **Edit**; assert push-model edit wizard URL. */
export async function editApplicationSetFromRowActions(
  applicationListPage: ApplicationListPage,
  applicationSetName: string
): Promise<void> {
  const table = applicationListPage.applicationsTable;
  await applicationListPage.goto();
  await table.search(applicationSetName);
  const row = table.getRowByName(applicationSetName);
  await table.openRowActions(row);
  await table.clickEditApplicationMenuItem();
  const page = applicationListPage.getPage();
  await expect(page).toHaveURL(new RegExp(`/edit.*${applicationSetName}`));
}
