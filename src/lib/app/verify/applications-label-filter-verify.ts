import { expect } from '@playwright/test';

import { APP_LABEL_FILTER, APP_TABLE_COLUMNS } from '@constants/app';
import type { ApplicationsTable } from '@components/app/ApplicationsTable';

export type LabelFilterOption = {
  /** Label key=value as shown in the filter (without trailing count). */
  label: string;
  expectedCount: number;
};

/** Filter menu uses spaces around `=`; Labels popover lists `key=value` lines. */
export function labelFilterToPopoverToken(labelKeyValue: string): string {
  const eqIndex = labelKeyValue.indexOf('=');
  if (eqIndex === -1) return labelKeyValue.trim();
  const key = labelKeyValue.slice(0, eqIndex).trim();
  const value = labelKeyValue.slice(eqIndex + 1).trim();
  return `${key}=${value}`;
}

/** Normalize PF SelectOption inner text (`key`, `=`, `value`, `count` lines) to one line. */
export function parseLabelFilterMenuItemText(raw: string): LabelFilterOption | null {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.+?)\s+(\d+)$/);
  if (!match) return null;
  return { label: match[1], expectedCount: Number(match[2]) };
}

/** First label option in the open Label filter (hub data varies). */
export async function readFirstLabelFilterOption(
  table: ApplicationsTable
): Promise<LabelFilterOption> {
  const menuitem = table.getLabelFilterListbox().getByRole('menuitem').first();
  await expect(menuitem).toBeVisible();
  const parsed = parseLabelFilterMenuItemText(await menuitem.innerText());
  if (!parsed || parsed.expectedCount < 1) {
    throw new Error(`Could not parse label filter option from: ${await menuitem.innerText()}`);
  }
  return parsed;
}

export async function verifyLabelFilterPanelOpen(table: ApplicationsTable): Promise<void> {
  await expect(table.getLabelFilterListbox()).toBeVisible();
  await expect(table.getLabelFilterSearchInput()).toBeVisible();
  await expect(
    table.getLabelFilterListbox().getByRole('heading', {
      name: APP_LABEL_FILTER.groupTitle,
      level: 1,
    })
  ).toBeVisible();
}

export async function verifyLabelFilterSearchNarrowsOptions(
  table: ApplicationsTable,
  option: LabelFilterOption
): Promise<void> {
  const listbox = table.getLabelFilterListbox();
  const before = await listbox.getByRole('menuitem').count();
  if (before < 2) return;

  const searchToken = option.label.split('=')[0]?.trim() ?? option.label;
  await table.searchLabelFilter(searchToken);
  await expect.poll(async () => listbox.getByRole('menuitem').count()).toBeLessThan(before);
  await expect(table.getLabelFilterCheckbox(option.label)).toBeVisible();
}

export async function verifyLabelsColumnVisible(table: ApplicationsTable): Promise<void> {
  await expect(table.getLabelsColumnHeader()).toBeVisible();
  await table.verifyColumnHeaderVisible(APP_TABLE_COLUMNS.labels);
}

/** At least one visible row shows a Labels column count badge before filtering. */
export async function verifyLabelsColumnShowsCountOnFirstRow(
  table: ApplicationsTable
): Promise<void> {
  const rows = table.getDataRows();
  const rowCount = await rows.count();
  for (let i = 0; i < rowCount; i++) {
    const button = table.getLabelsCountButton(rows.nth(i));
    if (await button.isVisible().catch(() => false)) {
      await expect(button).toBeVisible();
      return;
    }
  }
  throw new Error('No Applications table row shows a Labels count badge');
}

export async function verifyFilteredRowsLabelsColumnContainsLabel(
  table: ApplicationsTable,
  option: LabelFilterOption
): Promise<void> {
  const token = labelFilterToPopoverToken(option.label);
  const rowCount = await table.getDataRowCount();
  const rowsToCheck = Math.min(rowCount, 3);

  for (let i = 0; i < rowsToCheck; i++) {
    const row = table.getDataRows().nth(i);
    await expect(table.getLabelsCountButton(row)).toBeVisible();
    await table.openLabelsPopover(row);
    await expect(table.getLabelsPopoverContent()).toContainText(token);
    await table.closeLabelsPopover();
  }
}

export async function verifyApplicationsFilteredByLabel(
  table: ApplicationsTable,
  option: LabelFilterOption,
  initialRowCount: number
): Promise<void> {
  await table.selectLabelFilterOption(option.label);
  await expect(table.getLabelFilterButton()).toHaveAccessibleName(
    new RegExp(`Label\\s+1`, 'i')
  );
  await expect(table.getClearAllFiltersButton()).toBeVisible();

  const filteredRows = await table.getDataRowCount();
  expect(filteredRows).toBeLessThanOrEqual(initialRowCount);
  expect(filteredRows).toBeGreaterThan(0);
  // When all matches fit on one page, row count matches the badge on the filter option.
  if (option.expectedCount <= initialRowCount) {
    expect(filteredRows).toBe(option.expectedCount);
  }

  await verifyFilteredRowsLabelsColumnContainsLabel(table, option);
}

export async function verifyClearAllFiltersRestoresApplicationsList(
  table: ApplicationsTable,
  initialRowCount: number
): Promise<void> {
  await table.clickClearAllFilters();
  await expect(table.getLabelFilterButton()).toHaveAccessibleName(/^Label$/i);
  await expect.poll(async () => table.getDataRowCount()).toBe(initialRowCount);
}
