/* Copyright Contributors to the Open Cluster Management project */

/**
 * Governance: Bulk Actions (RHACM4K-6905)
 *
 * Verifies bulk status/remediation actions and individual kebab delete
 * on the policies table:
 *   - Bulk Disable / Enable (status sub-menu)
 *   - Bulk Inform / Enforce (remediation sub-menu)
 *   - Individual Delete via kebab menu
 */

import * as path from 'path';
import { test, expect } from '@fixtures/governance-test';
import { GOV_BULK_ACTION_TEST_RESOURCES } from '@constants/governance';
import { waitForAllPoliciesPropagated } from '@lib/governance/policy-lifecycle';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const CLUSTER_SET_BINDING_YAML = path.join(TEMPLATES_DIR, 'cluster-set-binding-default.yaml');
const RESOURCES_YAML = path.join(TEMPLATES_DIR, 'bulk-action-policies.yaml');

const POLICY_NAMES = [
  'test-bulk-action-1-e2e',
  'test-bulk-action-2-e2e',
  'test-bulk-action-3-e2e',
] as const;

test.describe.serial(
  'RHACM4K-6905: GRC: Verify "Bulk action" for GRC Data Table',
  { tag: ['@governance'] },
  () => {
    const res = GOV_BULK_ACTION_TEST_RESOURCES;

    test.beforeAll(async ({ oc }) => {
      test.setTimeout(180_000);
      try {
        await oc.applyYaml(CLUSTER_SET_BINDING_YAML);
      } catch {
        // Binding may already exist
      }
      await oc.applyYaml(RESOURCES_YAML);
      await waitForAllPoliciesPropagated(oc, res.namespace, POLICY_NAMES);
    });

    test.afterAll(async ({ oc }) => {
      await oc.deleteYaml(RESOURCES_YAML).catch(() => undefined);
    });

    test('RHACM4K-6905: GRC: Verify "Bulk action" for GRC Data Table', async ({
      governancePage,
      governanceTable,
      manageColumnsDialog,
      page,
    }) => {
      test.setTimeout(300_000);
      await governancePage.goto();
      await governancePage.openPoliciesTab();

      // Enable the Status column (hidden by default) to verify disable/enable
      await manageColumnsDialog.open();
      await manageColumnsDialog.checkColumn('Status');
      await manageColumnsDialog.save();

      // -----------------------------------------------------------------------
      // Bulk Disable
      // -----------------------------------------------------------------------
      await governanceTable.search(res.policyPrefix);
      await page.waitForLoadState('domcontentloaded');
      await expect(governanceTable.getRowByName(POLICY_NAMES[0])).toBeVisible({ timeout: 30_000 });

      await governanceTable.selectAllVisibleRows();
      await governanceTable.clickBulkAction('Disable');
      await governanceTable.confirmActionModal('Disable');

      for (const name of POLICY_NAMES) {
        await governanceTable.verifyCellValue(
          governanceTable.getRowByName(name),
          'status',
          /disabled/i
        );
      }

      // -----------------------------------------------------------------------
      // Bulk Enable
      // -----------------------------------------------------------------------
      await governanceTable.selectAllVisibleRows();
      await governanceTable.clickBulkAction('Enable');
      await governanceTable.confirmActionModal('Enable');

      for (const name of POLICY_NAMES) {
        await governanceTable.verifyCellValue(
          governanceTable.getRowByName(name),
          'status',
          /enabled/i
        );
      }

      // -----------------------------------------------------------------------
      // Bulk Inform
      // -----------------------------------------------------------------------
      await governanceTable.selectAllVisibleRows();
      await governanceTable.clickBulkAction('Inform');
      await governanceTable.confirmActionModal('Inform');

      for (const name of POLICY_NAMES) {
        await governanceTable.verifyCellValue(
          governanceTable.getRowByName(name),
          'remediation',
          /inform/i
        );
      }

      // -----------------------------------------------------------------------
      // Bulk Enforce
      // -----------------------------------------------------------------------
      await governanceTable.selectAllVisibleRows();
      await governanceTable.clickBulkAction('Enforce');
      await governanceTable.confirmActionModal('Enforce');

      for (const name of POLICY_NAMES) {
        await governanceTable.verifyCellValue(
          governanceTable.getRowByName(name),
          'remediation',
          /enforce/i
        );
      }

      // -----------------------------------------------------------------------
      // Delete each policy via kebab menu
      // -----------------------------------------------------------------------
      for (const name of POLICY_NAMES) {
        await governanceTable.search(name);
        await expect(governanceTable.getRowByName(name)).toBeVisible({ timeout: 30_000 });
        await governanceTable.clickRowAction(name, 'Delete');
        await governanceTable.confirmActionModal('Delete');
        await governanceTable.verifyPolicyNotInListing(name);
      }
    });
  }
);
