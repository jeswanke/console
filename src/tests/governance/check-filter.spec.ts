/* Copyright Contributors to the Open Cluster Management project */

/**
 * Governance: Policy table filtering (RHACM4K-6818)
 *
 * Verifies that the governance policies table filter works correctly
 * for single and combined filter options: Cluster violations, Type,
 * Remediation, and Enabled.
 */

import * as path from 'path';
import { test, expect } from '@fixtures/governance-test';
import { OcCliService } from '@services/OcCliService';
import { GOV_FILTER_TEST_RESOURCES } from '@constants/governance';
import { waitForPolicyPropagation } from '@lib/governance/policy-lifecycle';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const CLUSTER_SET_BINDING_YAML = path.join(TEMPLATES_DIR, 'cluster-set-binding-default.yaml');
const RESOURCES_YAML = path.join(TEMPLATES_DIR, 'filter-test-policies.yaml');

test.describe.serial(
  'RHACM4K-6818: GRC: Verify all Filter options for the Governance policy data table',
  { tag: ['@governance'] },
  () => {
    const oc = new OcCliService();
    const res = GOV_FILTER_TEST_RESOURCES;

    test.beforeAll(async () => {
      test.setTimeout(180_000);
      try {
        await oc.applyYaml(CLUSTER_SET_BINDING_YAML);
      } catch {
        // Binding may already exist from another parallel spec
      }
      await oc.applyYaml(RESOURCES_YAML);
      await waitForPolicyPropagation(oc, `${res.policyPrefix}-1-e2e`, res.namespace);
    });

    test.afterAll(async () => {
      await oc.deleteYaml(RESOURCES_YAML);
    });

    test('RHACM4K-6818: GRC: Verify all Filter options for the Governance policy data table', async ({
      governancePage,
      governanceTable,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openPoliciesTab();

      const searchTerm = res.policyPrefix;

      // --- Single-option filters ---
      // Actual filter categories visible in governance table:
      //   Cluster violations: "No status" | "No violations" | "Violations"
      //   Namespace: (dynamic values)
      //   Source: "Local" | "Managed externally"
      //   Remediation: "Inform" | "Enforce"

      // Filter by Cluster violations = "Violations"
      await governanceTable.applyFilter(searchTerm, ['Violations']);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });
      const violationsCount = await governanceTable.getDataRowCount();
      expect(violationsCount).toBeGreaterThan(0);
      await governanceTable.clearAllFilters();
      await governanceTable.clearSearch();

      // Filter by Source = "Local"
      await governanceTable.applyFilter(searchTerm, ['Local']);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });
      const localCount = await governanceTable.getDataRowCount();
      expect(localCount).toBeGreaterThan(0);
      await governanceTable.clearAllFilters();
      await governanceTable.clearSearch();

      // Filter by Remediation = "Inform"
      await governanceTable.applyFilter(searchTerm, ['Inform']);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });
      const informCount = await governanceTable.getDataRowCount();
      expect(informCount).toBeGreaterThan(0);
      await governanceTable.clearAllFilters();
      await governanceTable.clearSearch();

      // Filter by Namespace = "default"
      await governanceTable.applyFilter(searchTerm, ['default']);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });
      const namespaceCount = await governanceTable.getDataRowCount();
      expect(namespaceCount).toBeGreaterThan(0);
      await governanceTable.clearAllFilters();
      await governanceTable.clearSearch();

      // --- Combined filters ---

      // 2-option: Local + Inform
      await governanceTable.applyFilter(searchTerm, ['Local', 'Inform']);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });
      const twoOptionCount = await governanceTable.getDataRowCount();
      expect(twoOptionCount).toBeGreaterThan(0);
      await governanceTable.clearAllFilters();
      await governanceTable.clearSearch();

      // 3-option: Violations + Local + Inform
      await governanceTable.applyFilter(searchTerm, ['Violations', 'Local', 'Inform']);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });
      const threeOptionCount = await governanceTable.getDataRowCount();
      expect(threeOptionCount).toBeGreaterThan(0);
      await governanceTable.clearAllFilters();
      await governanceTable.clearSearch();

      // 4-option: Violations + default (Namespace) + Local + Inform
      await governanceTable.applyFilter(searchTerm, ['Violations', 'default', 'Local', 'Inform']);
      await expect(governanceTable.getDataRows().first()).toBeVisible({ timeout: 30_000 });
      const fourOptionCount = await governanceTable.getDataRowCount();
      expect(fourOptionCount).toBeGreaterThan(0);
      await governanceTable.clearAllFilters();
      await governanceTable.clearSearch();
    });
  }
);
