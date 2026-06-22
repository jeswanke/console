import { expect } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';

const STATUS_COLUMNS = ['healthStatus', 'syncStatus', 'podStatus'] as const;

/** Cypress `tbody tr` length after searching an owned ApplicationSet (parent + child app). */
export const APPSET_OWNED_APP_TABLE_ROW_COUNT = 2;

/**
 * Cypress: `cy.get('[data-ouia-component-type*="Table"] tbody tr').should('have.length', 2)`.
 */
export async function expectApplicationSetSearchTableRowCount(
  applicationListPage: ApplicationListPage,
  expectedRowCount: number = APPSET_OWNED_APP_TABLE_ROW_COUNT
): Promise<void> {
  const table = applicationListPage.applicationsTable;
  await expect
    .poll(() => table.getDataRowCount(), {
      timeout: 60_000,
      intervals: [1_000, 2_000, 5_000],
      message: `Expected ${expectedRowCount} table rows after ApplicationSet search`,
    })
    .toBe(expectedRowCount);
}

async function readGreenLabelCount(
  applicationListPage: ApplicationListPage,
  applicationSetName: string,
  columnKey: (typeof STATUS_COLUMNS)[number]
): Promise<number | null> {
  const table = applicationListPage.applicationsTable;
  const appsetRow = table.getRowByName(applicationSetName);
  const cell = table.getCellByLabel(appsetRow, columnKey);
  const greenLabel = cell.locator('[class*="c-label"][class*="pf-m-green"]');
  const visible = await greenLabel.isVisible().catch(() => false);
  if (!visible) return null;
  const text = (await greenLabel.textContent())?.trim() ?? '';
  const count = Number.parseInt(text, 10);
  return Number.isFinite(count) ? count : null;
}

/**
 * RHACM4K-4043: ApplicationSet row shows owned child apps with matching green status labels.
 */
export async function verifyApplicationSetOwnedAppRowsOnList(
  applicationListPage: ApplicationListPage,
  applicationSetName: string
): Promise<void> {
  const table = applicationListPage.applicationsTable;
  await applicationListPage.goto();
  await table.search(applicationSetName);
  await expectApplicationSetSearchTableRowCount(applicationListPage);

  const appsetRow = table.getRowByName(applicationSetName);
  await expect(appsetRow).toBeVisible({ timeout: 120_000 });

  await expect
    .poll(
      async () => {
        const counts: number[] = [];
        for (const columnKey of STATUS_COLUMNS) {
          const count = await readGreenLabelCount(applicationListPage, applicationSetName, columnKey);
          if (count === null || count < 1) return false;
          counts.push(count);
        }
        return counts.every((count) => count === counts[0]);
      },
      {
        timeout: 300_000,
        intervals: [2_000, 5_000, 10_000],
        message: `Expected matching green Health/Sync/Pod labels on ApplicationSet "${applicationSetName}"`,
      }
    )
    .toBe(true);
}
