import { test, expect } from '@fixtures/acm-test';

test.describe('Manage Columns - Cluster List', { tag: ['@cluster', '@clc'] }, () => {
  test('should allow admin to customize visible columns', async ({ page, clusterListPage }) => {
    await test.step('Go to Cluster list page', async () => {
      await clusterListPage.goto();
      await expect(page.getByLabel('columns-management')).toBeVisible();
    });

    await test.step('Open Manage columns dialog and verify default state', async () => {
      await clusterListPage.manageColumns.open();

      const uncheckedColumns = ['Created', 'Add-ons'];
      for (const column of uncheckedColumns) {
        await clusterListPage.manageColumns.verifyColumnUnchecked(column);
      }

      const requiredColumns = ['Name', 'Namespace', 'Status', 'Distribution version'];
      for (const column of requiredColumns) {
        await clusterListPage.manageColumns.verifyColumnDisabled(column);
      }

      const optionalColumns = ['Infrastructure', 'Control plane type', 'Cluster set', 'Labels', 'Nodes'];
      for (const column of optionalColumns) {
        await clusterListPage.manageColumns.verifyColumnEnabled(column);
      }
    });

    await test.step('Enable Add-ons and Created columns', async () => {
      await clusterListPage.manageColumns.checkColumn('Add-ons');
      await clusterListPage.manageColumns.checkColumn('Created');
      await clusterListPage.manageColumns.moveColumnAfter('Created', 'Name');
      await clusterListPage.manageColumns.verifyColumnChecked('Add-ons');
      await clusterListPage.manageColumns.verifyColumnChecked('Created');
    });

    await test.step('Disable Nodes column and save', async () => {
      await clusterListPage.manageColumns.uncheckColumn('Nodes');
      await clusterListPage.manageColumns.save();
    });

    await test.step('Verify columns appear in table', async () => {
      await clusterListPage.table.verifyColumnHeaderVisible('Add-ons');
      await clusterListPage.table.verifyColumnHeaderVisible('Created');
      await clusterListPage.table.verifyColumnHeaderNotVisible('Nodes');
      await clusterListPage.table.verifyColumnOrder(['Name', 'Created']);
    });

    await test.step('Reopen dialog and verify persisted state', async () => {
      await clusterListPage.manageColumns.open();
      await clusterListPage.manageColumns.verifyColumnChecked('Add-ons');
      await clusterListPage.manageColumns.verifyColumnChecked('Created');
      await clusterListPage.manageColumns.verifyColumnUnchecked('Nodes');
    });

    await test.step('Restore defaults', async () => {
      await clusterListPage.manageColumns.clickRestoreDefaults();
      await clusterListPage.manageColumns.save();
    });

    await test.step('Verify defaults restored in table', async () => {
      await clusterListPage.table.verifyColumnHeaderNotVisible('Created');
      await clusterListPage.table.verifyColumnHeaderNotVisible('Add-ons');
      await clusterListPage.table.verifyColumnHeaderVisible('Nodes');
    });
  });
});
