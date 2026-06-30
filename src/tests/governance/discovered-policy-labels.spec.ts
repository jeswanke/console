/**
 * Governance: Discovered policy cluster labels — view and filter.
 *
 * Polarion: RHACM4K-64205
 * Jira: ACM-30528, ACM-30458
 *
 * Verifies that a governance admin can view labels on the Clusters tab
 * of a discovered policy, open a label popover, filter clusters by label,
 * and that unlabeled policies show a dash with no filter control.
 */

import * as path from 'path';
import { test, expect } from '@fixtures/governance-test';
import { OcCliService } from '@services/OcCliService';
import {
  GOV_DISCOVERED_POLICY_DETAILS,
  GOV_DISCOVERED_TEST_RESOURCES,
} from '@constants/governance';
import { waitForPolicyPropagation } from '@lib/governance/policy-lifecycle';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const RESOURCES_YAML = path.join(TEMPLATES_DIR, 'discovered-policy-resources.yaml');

test.describe.serial(
  'Discovered policy cluster labels (RHACM4K-64205)',
  { tag: ['@governance'] },
  () => {
    const oc = new OcCliService();
    const res = GOV_DISCOVERED_TEST_RESOURCES;
    let targetCluster: string;

    test.beforeAll(async () => {
      test.setTimeout(180_000);
      await oc.applyYaml(RESOURCES_YAML);
      await waitForPolicyPropagation(oc, res.parentPolicy, res.namespace);

      const raw = await oc.run(
        `oc get placementdecision -n ${res.namespace} ` +
          `-l cluster.open-cluster-management.io/placement=${res.placement} ` +
          `-o jsonpath='{.items[0].status.decisions[0].clusterName}'`
      );
      targetCluster = raw.replace(/'/g, '');
    });

    test.afterAll(async () => {
      await oc.deleteYaml(RESOURCES_YAML);
      await oc.run(`oc delete namespace ${res.namespace} --ignore-not-found`);
    });

    // Polarion steps 1-3: Navigate to parent policy, verify Results tab
    test('RHACM4K-64205: parent policy Results tab shows propagated templates', async ({
      governancePage,
      policyDetailsPage,
      page,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openPoliciesTab();
      await governancePage.searchPolicies(res.parentPolicy);
      await expect(governancePage.getPolicyRow(res.parentPolicy)).toBeVisible();

      await governancePage.getPolicyRow(res.parentPolicy).click();
      await policyDetailsPage.waitForLoad(30_000);

      await policyDetailsPage.getResultsTab().click();
      await policyDetailsPage.waitForLoad(30_000);

      await expect(page.getByText(res.labeledPolicy)).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(res.unlabeledPolicy)).toBeVisible();
    });

    // Polarion steps 4-5: Both child ConfigurationPolicies on Discovered policies tab
    test('RHACM4K-64205: both child ConfigurationPolicies appear on Discovered policies tab', async ({
      governancePage,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openDiscoveredPoliciesTab();

      await expect(governancePage.getDiscoveredPolicyRow(res.labeledPolicy)).toBeVisible({
        timeout: 60_000,
      });

      await expect(governancePage.getDiscoveredPolicyRow(res.unlabeledPolicy)).toBeVisible({
        timeout: 60_000,
      });
    });

    // Polarion steps 6-9: Labels column, tag click, popover content
    test('RHACM4K-64205: labeled policy Clusters tab shows label tag and popover with details', async ({
      governancePage,
      discoveredPolicyDetailsPage,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openDiscoveredPoliciesTab();
      await governancePage.getDiscoveredPolicyRow(res.labeledPolicy).click();
      await discoveredPolicyDetailsPage.waitForLoad(30_000);

      await discoveredPolicyDetailsPage.openClustersTab();

      const labelTag = discoveredPolicyDetailsPage.getLabelCountTag(targetCluster);
      await expect(labelTag).toBeVisible({ timeout: 30_000 });
      await expect(labelTag).toHaveText(/1 label/);

      await labelTag.click();

      const popover = discoveredPolicyDetailsPage.getLabelPopover();
      await expect(popover).toBeVisible();
      await expect(popover).toContainText(res.label.formatted);
    });

    // Polarion steps 10-12: Label filter select, verify, clear
    test('RHACM4K-64205: Label filter filters clusters by label and clears', async ({
      governancePage,
      discoveredPolicyDetailsPage,
      page,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openDiscoveredPoliciesTab();
      await governancePage.getDiscoveredPolicyRow(res.labeledPolicy).click();
      await discoveredPolicyDetailsPage.waitForLoad(30_000);

      await discoveredPolicyDetailsPage.openClustersTab();

      const filterButton = discoveredPolicyDetailsPage.getLabelFilterButton();
      await expect(filterButton).toBeVisible();
      await filterButton.click();

      const option = discoveredPolicyDetailsPage.getLabelFilterOption(res.label.key);
      await expect(option).toBeVisible();
      await option.click();

      await discoveredPolicyDetailsPage.waitForLoad(30_000);

      await expect(page.getByRole('row').filter({ hasText: targetCluster })).toBeVisible();

      await discoveredPolicyDetailsPage.clearFilters();
    });

    // Polarion steps 13-17: Unlabeled policy shows dash, no filter button
    test('RHACM4K-64205: unlabeled policy Clusters tab shows dash and no label filter', async ({
      governancePage,
      discoveredPolicyDetailsPage,
    }) => {
      test.slow();
      await governancePage.goto();
      await governancePage.openDiscoveredPoliciesTab();
      await governancePage.getDiscoveredPolicyRow(res.unlabeledPolicy).click();
      await discoveredPolicyDetailsPage.waitForLoad(30_000);

      await discoveredPolicyDetailsPage.openClustersTab();

      const row = discoveredPolicyDetailsPage.getClusterRow(targetCluster);
      await expect(row).toBeVisible({ timeout: 30_000 });

      const labelTag = discoveredPolicyDetailsPage.getLabelCountTag(targetCluster);
      await expect(labelTag).toHaveCount(0);

      await expect(row).toContainText(GOV_DISCOVERED_POLICY_DETAILS.noLabelsIndicator);

      await expect(discoveredPolicyDetailsPage.getLabelFilterButton()).toHaveCount(0, {
        timeout: 10_000,
      });
    });
  }
);
