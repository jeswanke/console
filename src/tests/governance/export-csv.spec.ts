/* Copyright Contributors to the Open Cluster Management project */

/**
 * Governance: Export CSV (RHACM4K-52041 through RHACM4K-52044)
 *
 * Verifies CSV export from:
 *   - Policies list table
 *   - Policy results table
 *   - Policy history table
 *   - PolicySet details (clusters and policies tabs)
 */

import * as path from 'path';
import { test, expect } from '@fixtures/governance-test';
import {
  GOV_EXPORT_CSV_TEST_RESOURCES,
  GOV_TABLE_COLUMNS,
  GOV_TABLE_MANAGE_COLUMNS,
  GOV_TOOLBAR,
} from '@constants/governance';
import {
  downloadCSV,
  parseCSV,
  verifyCSVColumnsExist,
  verifyCSVHasRows,
} from '@lib/governance/csv-utils';
import { waitForPolicyPropagation } from '@lib/governance/policy-lifecycle';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const CLUSTER_SET_BINDING_YAML = path.join(TEMPLATES_DIR, 'cluster-set-binding-default.yaml');
const RESOURCES_YAML = path.join(TEMPLATES_DIR, 'export-csv-policyset.yaml');

const POLICIES_LIST_CSV_COLUMNS = [
  GOV_TABLE_COLUMNS.name,
  GOV_TABLE_COLUMNS.namespace,
  GOV_TABLE_COLUMNS.status,
  GOV_TABLE_COLUMNS.clusterViolations,
  GOV_TABLE_COLUMNS.remediation,
  GOV_TABLE_COLUMNS.policySet,
  GOV_TABLE_COLUMNS.source,
  'Standards',
  'Controls',
  'Categories',
  'Description',
  GOV_TABLE_COLUMNS.automation,
  GOV_TABLE_COLUMNS.created,
];

const POLICY_RESULTS_CSV_COLUMNS = [
  'Cluster',
  'Violations',
  'Template',
  'Message',
  'Remediation',
  'Last report',
];

const POLICY_HISTORY_CSV_COLUMNS = ['Violations', 'Message', 'Last report'];

const POLICYSET_CLUSTERS_CSV_COLUMNS = ['Cluster name'];

const POLICYSET_POLICIES_CSV_COLUMNS = [
  'Policy name',
  'Cluster violations',
  'Status',
  'Remediation',
];

test.describe.serial(
  'GRC: Test export CSV functionality in GRC pages',
  { tag: ['@governance'] },
  () => {
    const res = GOV_EXPORT_CSV_TEST_RESOURCES;

    test.beforeAll(async ({ oc }) => {
      test.setTimeout(180_000);
      try {
        await oc.applyYaml(CLUSTER_SET_BINDING_YAML);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('AlreadyExists')) throw err;
      }
      await oc.applyYaml(RESOURCES_YAML);
      await waitForPolicyPropagation(
        oc,
        `${res.policyPrefix}-ns-spec-exportcsv-e2e`,
        res.namespace
      );
    });

    test.afterAll(async ({ oc }) => {
      await oc.deleteYaml(RESOURCES_YAML);
    });

    test('RHACM4K-52041: GRC: Policies list can be exported as CSV file from UI', async ({
      governancePage,
      governanceTable,
      manageColumnsDialog,
      page,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openPoliciesTab();

      // Enable all columns so the CSV includes every possible column
      await manageColumnsDialog.open();
      for (const col of GOV_TABLE_MANAGE_COLUMNS.defaultUnchecked) {
        await manageColumnsDialog.checkColumn(col);
      }
      await manageColumnsDialog.save();

      await governanceTable.search(res.policyPrefix);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });

      const csvPath = await downloadCSV(page, () => governanceTable.clickExportCSV());
      const rows = parseCSV(csvPath);

      verifyCSVColumnsExist(rows, POLICIES_LIST_CSV_COLUMNS);
      verifyCSVHasRows(rows, 2);

      // Restore default column visibility
      await manageColumnsDialog.open();
      await manageColumnsDialog.restoreDefaultsAndSave();
    });

    test('RHACM4K-52042: GRC: Policy results can be exported as CSV file from UI', async ({
      policyDetailsPage,
      page,
    }) => {
      test.slow();
      const policyName = `${res.policyPrefix}-ns-spec-exportcsv-e2e`;
      await policyDetailsPage.goto(res.namespace, policyName);
      await policyDetailsPage.getResultsTab().click();
      await policyDetailsPage.waitForLoad(30_000);

      const exportButton = page
        .locator(`button[aria-label="${GOV_TOOLBAR.exportButtonAriaLabel}"]`)
        .first();
      await expect(exportButton).toBeVisible({ timeout: 30_000 });

      const csvPath = await downloadCSV(page, async () => {
        await exportButton.click();
        await page.getByRole('menuitem', { name: GOV_TOOLBAR.exportAllToCSVLabel }).click();
      });
      const rows = parseCSV(csvPath);

      verifyCSVColumnsExist(rows, POLICY_RESULTS_CSV_COLUMNS);
      verifyCSVHasRows(rows, 1);
    });

    test('RHACM4K-52043: GRC: Compliance history of a policy template for specific cluster can be exported as CSV file from UI', async ({
      policyDetailsPage,
      page,
    }) => {
      test.slow();
      const policyName = `${res.policyPrefix}-ns-spec-exportcsv-e2e`;
      await policyDetailsPage.goto(res.namespace, policyName);
      await policyDetailsPage.getResultsTab().click();
      await policyDetailsPage.waitForLoad(30_000);

      // Click "View history" link in the results table to navigate to history page
      const viewHistoryLink = page.getByRole('link', { name: 'View history' }).first();
      await expect(viewHistoryLink).toBeVisible({ timeout: 30_000 });
      await viewHistoryLink.click();
      await page.waitForLoadState('domcontentloaded');

      const exportButton = page
        .locator(`button[aria-label="${GOV_TOOLBAR.exportButtonAriaLabel}"]`)
        .first();
      await expect(exportButton).toBeVisible({ timeout: 30_000 });

      const csvPath = await downloadCSV(page, async () => {
        await exportButton.click();
        await page.getByRole('menuitem', { name: GOV_TOOLBAR.exportAllToCSVLabel }).click();
      });
      const rows = parseCSV(csvPath);

      verifyCSVColumnsExist(rows, POLICY_HISTORY_CSV_COLUMNS);
      verifyCSVHasRows(rows, 1);
    });

    test('RHACM4K-52044: GRC: Policyset information can be exported as CSV file from UI', async ({
      governancePage,
      page,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openPolicySetsTab();

      const policySetCard = governancePage.getPolicySetCard(
        `${res.policySetPrefix}-1-exportcsv-e2e`
      );
      await expect(policySetCard).toBeVisible({ timeout: 30_000 });
      await policySetCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Scope interactions to the drawer panel so we don't hit the main page tables/tabs
      const drawerPanel = page.locator('.pf-v6-c-drawer__panel');

      // Export from clusters/status tab (default when drawer opens)
      const exportButton = drawerPanel.locator(
        `button[aria-label="${GOV_TOOLBAR.exportButtonAriaLabel}"]`
      );
      await expect(exportButton).toBeVisible({ timeout: 30_000 });

      const csvPath = await downloadCSV(page, async () => {
        await exportButton.click();
        await page.getByRole('menuitem', { name: GOV_TOOLBAR.exportAllToCSVLabel }).click();
      });
      const clusterRows = parseCSV(csvPath);
      verifyCSVColumnsExist(clusterRows, POLICYSET_CLUSTERS_CSV_COLUMNS);
      verifyCSVHasRows(clusterRows, 1);

      // Switch to policies toggle (ToggleGroupItem with buttonId="policies")
      const policiesToggle = drawerPanel.locator('button#policies');
      await expect(policiesToggle).toBeVisible({ timeout: 10_000 });
      await policiesToggle.click();
      await page.waitForLoadState('domcontentloaded');

      const policiesExportButton = drawerPanel.locator(
        `button[aria-label="${GOV_TOOLBAR.exportButtonAriaLabel}"]`
      );
      await expect(policiesExportButton).toBeVisible({ timeout: 30_000 });

      const policiesCsvPath = await downloadCSV(page, async () => {
        await policiesExportButton.click();
        await page.getByRole('menuitem', { name: GOV_TOOLBAR.exportAllToCSVLabel }).click();
      });
      const policyRows = parseCSV(policiesCsvPath);
      verifyCSVColumnsExist(policyRows, POLICYSET_POLICIES_CSV_COLUMNS);
      verifyCSVHasRows(policyRows, 2);
    });
  }
);
