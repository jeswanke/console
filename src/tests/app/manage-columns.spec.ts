/**
 * RHACM4K-63768: Applications list **Manage columns** (Overview table).
 *
 * Architecture: spec is declarative; {@link ManageColumnsDialog} + {@link ApplicationsTable}
 * (via {@link ApplicationListPage}) hold locators; column labels live in {@link APP_TABLE_COLUMNS}.
 */
import { test } from '@fixtures/app-test';
import { APP_TABLE_COLUMNS, APP_TABLE_MANAGE_COLUMNS } from '@constants/app';

test.describe(
  'Applications list manage columns',
  { tag: ['@app', '@alc', '@UI', '@RHACM4K-63768'] },
  () => {
    test(
      'RHACM4K-63768: As a cluster admin, I can manage additional columns for different applications',
      async ({ applicationListPage }) => {
        const { manageColumns, applicationsTable: table } = applicationListPage;

        await test.step('Go to Applications and verify Manage columns is available', async () => {
          await applicationListPage.goto();
          await applicationListPage.verifyManageColumnsButtonVisible();
        });

        await test.step('Open Manage columns and verify default dialog state', async () => {
          await manageColumns.open();
          await manageColumns.verifyDefaults(APP_TABLE_MANAGE_COLUMNS);
        });

        await test.step('Enable Created, move it under Name, hide Pod Status, and save', async () => {
          await manageColumns.customizeAndSave({
            enable: [APP_TABLE_COLUMNS.created],
            moveAfter: { column: APP_TABLE_COLUMNS.created, target: APP_TABLE_COLUMNS.name },
            hide: [APP_TABLE_COLUMNS.podStatus],
          });
        });

        await test.step('Verify table reflects changes, restore defaults, and verify restored state', async () => {
          await table.verifyColumnHeaderVisible(APP_TABLE_COLUMNS.created);
          await table.verifyColumnHeaderNotVisible(APP_TABLE_COLUMNS.podStatus);
          await table.verifyColumnOrder([
            APP_TABLE_COLUMNS.name,
            APP_TABLE_COLUMNS.created,
          ]);

          await manageColumns.open();
          await manageColumns.verifyColumnChecked(APP_TABLE_COLUMNS.created);
          await manageColumns.verifyColumnUnchecked(APP_TABLE_COLUMNS.podStatus);

          await manageColumns.restoreDefaultsAndSave();

          await table.verifyColumnHeaderNotVisible(APP_TABLE_COLUMNS.created);
          await table.verifyColumnHeaderVisible(APP_TABLE_COLUMNS.podStatus);
        });
      }
    );
  }
);
