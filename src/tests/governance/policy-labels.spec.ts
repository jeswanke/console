/**
 * Governance: Labels on Individual Policy Details Page (RHACM4K-63381)
 *
 * Verifies that labels display correctly on both discovered and managed
 * policy template details pages, including label filtering on the
 * Clusters tab.
 *
 * Story: ACM-30459
 * Polarion: RHACM4K-63381
 *
 * Prerequisite: MCH component `cluster-backup: true` (enabled by default
 * in QE CI/CD via automation-acm). Provides the discovered policy
 * (acm-backup-phase-validation) and managed policy (backup-restore-enabled)
 * used across all 8 test steps. Skips if not available.
 */

import { test, expect } from '@fixtures/governance-test';
import { OcCliService } from '@services/OcCliService';

import {
  GOV_LABELS,
  GOV_POLICY_API,
  GOV_CLUSTER_BACKUP,
} from '@constants/governance';

const TEST_LABELS = {
  environment: 'production',
  team: 'platform',
} as const;

const { clusterName } = GOV_CLUSTER_BACKUP;
const ocSvc = new OcCliService();

test.describe(
  'Governance - Labels on Individual Policy Details Page',
  { tag: ['@governance'] },
  () => {
    test.setTimeout(360_000);

    const labelKeys = Object.keys(TEST_LABELS);
    let hasClusterBackup = false;

    test.beforeAll(async () => {

      hasClusterBackup = await ocSvc.policyExists(
        GOV_CLUSTER_BACKUP.discoveredPolicy,
        clusterName,
      );

      if (!hasClusterBackup) return;

      await ocSvc.policyRemoveLabels(
        GOV_CLUSTER_BACKUP.discoveredPolicy,
        clusterName,
        labelKeys,
      );
    });

    test.beforeEach(() => {
      test.skip(
        !hasClusterBackup,
        'cluster-backup component not enabled (no discovered policies)',
      );
    });

    test.afterAll(async () => {
      if (!hasClusterBackup) return;

      await ocSvc.policyRemoveLabels(
        GOV_CLUSTER_BACKUP.discoveredPolicy,
        clusterName,
        labelKeys,
      );
    });

    test('RHACM4K-63381: Labels on discovered and managed policy template details', async ({
      governancePage,
      policyTemplateDetailsPage,
      oc,
      page,
    }) => {
      await test.step(
        '1: Navigate to discovered policies and select policy',
        async () => {
          await governancePage.gotoDiscoveredPolicies();

          const policyLink = governancePage.getPolicyLink(
            GOV_CLUSTER_BACKUP.discoveredPolicy,
          );
          await expect(policyLink).toBeVisible({ timeout: 30_000 });
          await policyLink.click();
          await governancePage.waitForLoad();
        },
      );

      await test.step(
        '2: Verify Labels column shows dash on Clusters tab',
        async () => {
          await governancePage.clickClustersTab();

          await expect(async () => {
            await governancePage.navigateToDiscoveredPolicyClusters(
              GOV_POLICY_API.group,
              GOV_POLICY_API.version,
              GOV_POLICY_API.kind,
              GOV_CLUSTER_BACKUP.discoveredPolicy,
            );
            await governancePage.waitForLoad();
            const labelsCell =
              await governancePage.getClusterLabelsCell(
                clusterName,
              );
            await expect(labelsCell).toHaveText(
              GOV_LABELS.noLabels,
            );
          }).toPass({
            intervals: [5_000, 10_000, 15_000],
            timeout: 240_000,
          });
        },
      );

      await test.step(
        '3: Verify Labels shows dash on policy template details',
        async () => {
          await governancePage
            .getClusterLink(clusterName)
            .click();
          await policyTemplateDetailsPage.waitForLoad();

          const labelsValue =
            policyTemplateDetailsPage.getLabelsFieldValue();
          await expect(labelsValue).toBeVisible();
          await expect(labelsValue).toHaveText(GOV_LABELS.noLabels);
        },
      );

      await test.step(
        '4: Add user-defined labels via CLI',
        async () => {
          await oc.policyAddLabels(
            GOV_CLUSTER_BACKUP.discoveredPolicy,
            clusterName,
            TEST_LABELS,
          );

          const output = await oc.policyGetLabels(
            GOV_CLUSTER_BACKUP.discoveredPolicy,
            clusterName,
          );
          expect(output).toContain('environment');
          expect(output).toContain('team');
        },
      );

      await test.step(
        '5: Verify Labels column shows labels after adding',
        async () => {
          await expect(async () => {
            await governancePage.navigateToDiscoveredPolicyClusters(
              GOV_POLICY_API.group,
              GOV_POLICY_API.version,
              GOV_POLICY_API.kind,
              GOV_CLUSTER_BACKUP.discoveredPolicy,
            );
            await governancePage.waitForLoad();
            const labelsCell =
              await governancePage.getClusterLabelsCell(
                clusterName,
              );
            await expect(labelsCell).not.toHaveText(
              GOV_LABELS.noLabels,
            );
          }).toPass({
            intervals: [10_000, 15_000, 20_000],
            timeout: 240_000,
          });

          const labelsCell =
            await governancePage.getClusterLabelsCell(
              clusterName,
            );
          const labelButton = labelsCell.getByRole('button');
          await expect(labelButton).toContainText(/\d+ labels?/);

          await labelButton.click();
          const popover = governancePage.getLabelsPopover();
          await expect(popover).toBeVisible();
          await expect(popover).toContainText(
            `environment=${TEST_LABELS.environment}`,
            { timeout: 5_000 },
          );
          await expect(popover).toContainText(
            `team=${TEST_LABELS.team}`,
          );

          await expect(popover).not.toContainText('cluster-name=');
          await expect(popover).not.toContainText(
            'cluster-namespace=',
          );
          await expect(popover).not.toContainText(
            'policy.open-cluster-management.io/',
          );

          await page.keyboard.press('Escape');
        },
      );

      await test.step(
        '6: Verify Labels display on policy template details after adding',
        async () => {
          await governancePage.gotoDiscoveredPolicyClusters(
            GOV_POLICY_API.group,
            GOV_POLICY_API.version,
            GOV_POLICY_API.kind,
            GOV_CLUSTER_BACKUP.discoveredPolicy,
          );
          await governancePage
            .getClusterLink(clusterName)
            .click();
          await policyTemplateDetailsPage.waitForLoad();

          const labelsValue =
            policyTemplateDetailsPage.getLabelsFieldValue();
          await expect(labelsValue).toBeVisible();
          await expect(labelsValue).not.toHaveText(
            GOV_LABELS.noLabels,
          );
          await expect(labelsValue).toContainText(
            `environment=${TEST_LABELS.environment}`,
          );
          await expect(labelsValue).toContainText(
            `team=${TEST_LABELS.team}`,
          );
        },
      );

      await test.step(
        '7: Verify Labels on managed policy template details',
        async () => {
          await governancePage.gotoPolicyTemplateDetails(
            GOV_CLUSTER_BACKUP.managedPolicyNs,
            GOV_CLUSTER_BACKUP.managedPolicyName,
            clusterName,
            GOV_POLICY_API.group,
            GOV_POLICY_API.version,
            GOV_POLICY_API.kind,
            GOV_CLUSTER_BACKUP.managedTemplateName,
          );

          const labelsValue =
            policyTemplateDetailsPage.getLabelsFieldValue();
          await expect(labelsValue).toBeVisible();
          await expect(labelsValue).toHaveText(GOV_LABELS.noLabels);
        },
      );

      await test.step(
        '8: Verify Label filter on Clusters tab',
        async () => {
          await governancePage.gotoDiscoveredPolicyClusters(
            GOV_POLICY_API.group,
            GOV_POLICY_API.version,
            GOV_POLICY_API.kind,
            GOV_CLUSTER_BACKUP.discoveredPolicy,
          );

          const labelFilterBtn =
            governancePage.getLabelFilterButton();
          await expect(labelFilterBtn).toBeVisible({
            timeout: 30_000,
          });

          await governancePage.openLabelFilter();
          await governancePage.selectLabelFilterValue(
            `environment=${TEST_LABELS.environment}`,
          );
          await governancePage.waitForLoad();

          const clusterRow =
            governancePage.getClusterRow(clusterName);
          await expect(clusterRow).toBeVisible();

          await governancePage.clearAllFilters();
          await expect(clusterRow).toBeVisible();

          await governancePage.openLabelFilter();
          await governancePage.toggleLabelFilterInequality(
            `environment=${TEST_LABELS.environment}`,
          );
          await governancePage.waitForLoad();
          await expect(clusterRow).toBeHidden();

          await governancePage.clearAllFilters();
        },
      );
    });
  },
);
