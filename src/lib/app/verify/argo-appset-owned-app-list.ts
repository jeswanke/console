import { expect } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';

const STATUS_COLUMNS = ['healthStatus', 'syncStatus', 'podStatus'] as const;

/** Minimum rows: 1 parent ApplicationSet + at least 1 child app. */
export const APPSET_MIN_TABLE_ROW_COUNT = 2;

export async function expectApplicationSetSearchTableRowCount(
  applicationListPage: ApplicationListPage,
  minRowCount: number = APPSET_MIN_TABLE_ROW_COUNT
): Promise<void> {
  const table = applicationListPage.applicationsTable;
  await expect
    .poll(() => table.getDataRowCount(), {
      timeout: 60_000,
      intervals: [1_000, 2_000, 5_000],
      message: `Expected at least ${minRowCount} table rows after ApplicationSet search`,
    })
    .toBeGreaterThanOrEqual(minRowCount);
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
  const visible = await greenLabel.isVisible();
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
        for (const columnKey of STATUS_COLUMNS) {
          const count = await readGreenLabelCount(
            applicationListPage,
            applicationSetName,
            columnKey
          );
          if (count === null || count < 1) return false;
        }
        return true;
      },
      {
        timeout: 300_000,
        intervals: [2_000, 5_000, 10_000],
        message: `Expected at least one green Health/Sync/Pod label on ApplicationSet "${applicationSetName}"`,
      }
    )
    .toBe(true);
}
