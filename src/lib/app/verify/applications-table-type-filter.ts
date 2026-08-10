/**
 * RHACM4K-6902 / RHACM4K-6903 — Applications Overview table Type filter and Type column.
 * Cypress: `Argo_App_Table_Test_Suite.cy.js`.
 */
import { expect } from '@playwright/test';
import { APP_FILTER, APP_TABLE_TYPE_VALUES } from '@constants/app';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ApplicationsTable } from '@components/app/ApplicationsTable';

export type ApplicationTableTypeFilterCase = {
  applicationListPage: ApplicationListPage;
  applicationSetName: string;
  subscriptionName: string;
};

/** Cypress `resourceTable.rowShouldExist` — toolbar search then row visible. */
export async function expectApplicationRowVisibleAfterSearch(
  table: ApplicationsTable,
  applicationName: string,
  timeoutMs = 30_000
): Promise<void> {
  await table.search(applicationName);
  await expect(table.getRowByName(applicationName)).toBeVisible({ timeout: timeoutMs });
}

/** Cypress `rowShouldNotExist(..., disableSearch=true)` — row absent in the current filtered view. */
export async function expectApplicationRowAbsentInCurrentView(
  table: ApplicationsTable,
  applicationName: string,
  timeoutMs = 50_000
): Promise<void> {
  await expect(table.getRowByName(applicationName)).toHaveCount(0, { timeout: timeoutMs });
}

/** Assert the **Type** cell for a searched row contains expected text (RHACM4K-6903). */
export async function expectApplicationTypeColumnContains(
  table: ApplicationsTable,
  applicationName: string,
  typeSubstring: string,
  timeoutMs = 60_000
): Promise<void> {
  await table.search(applicationName);
  const row = table.getRowByName(applicationName);
  await expect(row).toBeVisible({ timeout: timeoutMs });
  const typeCell = table.getCellByLabel(row, 'type');
  await expect(typeCell).toContainText(typeSubstring);
}

/**
 * RHACM4K-6902: filter **Application set** vs **Subscription** and assert row visibility.
 */
export async function verifyApplicationTypeFiltersOnOverviewTable(
  params: ApplicationTableTypeFilterCase
): Promise<void> {
  const { applicationListPage, applicationSetName, subscriptionName } = params;
  const table = applicationListPage.applicationsTable;

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  await table.selectFilterOption(APP_FILTER.typeOptions.applicationSet);
  await applicationListPage.waitForLoad();
  await expectApplicationRowVisibleAfterSearch(table, applicationSetName);
  await expectApplicationRowAbsentInCurrentView(table, subscriptionName);

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  await table.selectFilterOption(APP_FILTER.typeOptions.subscription);
  await applicationListPage.waitForLoad();
  await expectApplicationRowVisibleAfterSearch(table, subscriptionName);
  await expectApplicationRowAbsentInCurrentView(table, applicationSetName);
}

/** RHACM4K-6903: Type column shows Application set / Subscription for each app. */
export async function verifyApplicationTypeColumnOnOverviewTable(params: {
  applicationListPage: ApplicationListPage;
  applicationSetName: string;
  subscriptionName: string;
}): Promise<void> {
  const { applicationListPage, applicationSetName, subscriptionName } = params;
  const table = applicationListPage.applicationsTable;

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  await expectApplicationTypeColumnContains(
    table,
    applicationSetName,
    APP_TABLE_TYPE_VALUES.applicationSet
  );

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  await expectApplicationTypeColumnContains(
    table,
    subscriptionName,
    APP_TABLE_TYPE_VALUES.subscription
  );
}
