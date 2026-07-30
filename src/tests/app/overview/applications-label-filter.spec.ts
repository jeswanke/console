/**
 * RHACM4K-64616 — Applications list: filter applications by resource labels.
 *
 * UI: dedicated **Label** toolbar filter (`#acm-table-filter-select-Label`) with in-panel search,
 * key=value checkboxes (count badge), **Clear all filters**, and **Labels** table column (count badge + popover).
 */
import { test, expect } from '@fixtures/app-test';
import {
  readFirstLabelFilterOption,
  verifyApplicationsFilteredByLabel,
  verifyClearAllFiltersRestoresApplicationsList,
  verifyLabelFilterPanelOpen,
  verifyLabelFilterSearchNarrowsOptions,
  verifyLabelsColumnShowsCountOnFirstRow,
  verifyLabelsColumnVisible,
} from '@lib/app/verify/applications-label-filter-verify';

test.describe(
  'Applications list — label filter',
  { tag: ['@app', '@alc', '@RHACM4K-64616'] },
  () => {
    test(
      'RHACM4K-64616: ALC: As an application admin, I can filter applications through labels',
      { tag: ['@RHACM4K-64616'] },
      async ({ applicationListPage }) => {
        await applicationListPage.goto();
        await applicationListPage.waitForLoad();

        const table = applicationListPage.applicationsTable;
        await expect(table.getLabelFilterButton()).toBeVisible({ timeout: 30_000 });

        const initialRowCount = await table.getDataRowCount();
        if (initialRowCount === 0) {
          test.skip(true, 'No applications on hub — label filter needs at least one app');
        }

        await test.step('Labels column is visible with label count badges', async () => {
          await verifyLabelsColumnVisible(table);
          await verifyLabelsColumnShowsCountOnFirstRow(table);
        });

        await test.step('Open Label filter and verify panel', async () => {
          await table.openLabelFilter();
          await verifyLabelFilterPanelOpen(table);
        });

        const option = await readFirstLabelFilterOption(table);

        await test.step('Search narrows label options', async () => {
          await verifyLabelFilterSearchNarrowsOptions(table, option);
        });

        await test.step('Select label filter and verify table and Labels column', async () => {
          await verifyApplicationsFilteredByLabel(table, option, initialRowCount);
        });

        await test.step('Clear all filters restores the list', async () => {
          await verifyClearAllFiltersRestoresApplicationsList(table, initialRowCount);
        });
      }
    );
  }
);
