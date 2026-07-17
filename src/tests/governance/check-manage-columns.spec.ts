/* Copyright Contributors to the Open Cluster Management project */

/**
 * Governance: Manage columns (RHACM4K-37242)
 *
 * Verifies that the governance policies table "Manage columns" dialog
 * correctly shows default checked/unchecked columns, persists column
 * visibility across page refreshes, and restores defaults.
 */

import * as path from 'path';
import { test, expect } from '@fixtures/governance-test';
import { OcCliService } from '@services/OcCliService';
import {
  GOV_TABLE_COLUMNS,
  GOV_TABLE_MANAGE_COLUMNS,
  GOV_MANAGE_COLUMNS_TEST_RESOURCES,
} from '@constants/governance';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const RESOURCES_YAML = path.join(TEMPLATES_DIR, 'manage-columns-policies.yaml');

async function waitForPolicyCreated(
  oc: OcCliService,
  namespace: string,
  policyName: string,
  timeoutMs = 60_000
): Promise<void> {
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const name = await oc.run(
        `oc get policy ${policyName} -n ${namespace} -o jsonpath='{.metadata.name}' 2>/dev/null || true`
      );
      if (name && name.includes(policyName)) return;
    } catch {
      // Policy may not exist yet
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(`Policy ${policyName} was not created within ${timeoutMs / 1000}s`);
}

test.describe.serial(
  'RHACM4K-37242: GRC: Verify Manage columns option for policies table',
  { tag: ['@governance'] },
  () => {
    const res = GOV_MANAGE_COLUMNS_TEST_RESOURCES;

    test.beforeAll(async ({ oc }) => {
      test.setTimeout(180_000);
      await oc.applyYaml(RESOURCES_YAML);
      await waitForPolicyCreated(oc, res.namespace, `${res.policyPrefix}-1-e2e`);
    });

    test.afterAll(async ({ oc }) => {
      await oc.deleteYaml(RESOURCES_YAML);
    });

    test('RHACM4K-37242: GRC: Verify Manage columns option for policies table', async ({
      governancePage,
      governanceTable,
      manageColumnsDialog,
      page,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openPoliciesTab();
      await governanceTable.search(res.policyPrefix);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });

      // Step 1: Verify default visible columns
      for (const col of GOV_TABLE_MANAGE_COLUMNS.defaultChecked) {
        await governanceTable.verifyColumnHeaderVisible(col);
      }

      // Step 2: Verify default hidden columns
      for (const col of GOV_TABLE_MANAGE_COLUMNS.defaultUnchecked) {
        await governanceTable.verifyColumnHeaderNotVisible(col);
      }

      // Step 3: Open manage columns dialog and verify default check states
      await manageColumnsDialog.open();
      await manageColumnsDialog.verifyDefaults(GOV_TABLE_MANAGE_COLUMNS);

      // Step 4: Check the default-unchecked columns so all columns are visible
      for (const col of GOV_TABLE_MANAGE_COLUMNS.defaultUnchecked) {
        await manageColumnsDialog.checkColumn(col);
      }
      await manageColumnsDialog.save();

      // Step 5: Verify all columns are now visible
      const allColumns = Object.values(GOV_TABLE_COLUMNS);
      for (const col of allColumns) {
        await governanceTable.verifyColumnHeaderVisible(col);
      }

      // Step 6: Reload page and verify columns persist
      await page.reload();
      await governancePage.openPoliciesTab();
      await governanceTable.search(res.policyPrefix);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });

      for (const col of allColumns) {
        await governanceTable.verifyColumnHeaderVisible(col);
      }

      // Step 7: Restore defaults and verify original state
      await manageColumnsDialog.open();
      await manageColumnsDialog.restoreDefaultsAndSave();

      for (const col of GOV_TABLE_MANAGE_COLUMNS.defaultChecked) {
        await governanceTable.verifyColumnHeaderVisible(col);
      }
      for (const col of GOV_TABLE_MANAGE_COLUMNS.defaultUnchecked) {
        await governanceTable.verifyColumnHeaderNotVisible(col);
      }
    });
  }
);
