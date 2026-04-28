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
import { GOV_ROUTES, GOV_LABELS } from '@constants/governance';

const TEST_POLICY = 'acm-backup-phase-validation';
const POLICY_API_GROUP = 'policy.open-cluster-management.io';
const POLICY_API_VERSION = 'v1';
const POLICY_KIND = 'ConfigurationPolicy';
const CLUSTER_NAME = 'local-cluster';

const TEST_LABELS = {
  environment: 'production',
  team: 'platform',
} as const;

const MANAGED_POLICY_NS = 'open-cluster-management-backup';
const MANAGED_POLICY_NAME = 'backup-restore-enabled';
const MANAGED_TEMPLATE_NAME = 'acm-backup-pod-running';

test.describe(
  'Governance - Labels on Individual Policy Details Page',
  { tag: ['@governance'] },
  () => {
    test.setTimeout(360_000);

    const labelKeys = Object.keys(TEST_LABELS);
    let hasClusterBackup = false;

    test.beforeAll(async () => {
      const oc = new OcCliService();
      hasClusterBackup = await oc
        .run(
          `oc get configurationpolicy ${TEST_POLICY} -n ${CLUSTER_NAME} --no-headers 2>/dev/null`,
        )
        .then(() => true)
        .catch(() => false);

      if (!hasClusterBackup) return;

      await oc
        .run(
          `oc label configurationpolicy ${TEST_POLICY} -n ${CLUSTER_NAME} ${labelKeys.map((k) => `${k}-`).join(' ')} 2>/dev/null || true`,
        )
        .catch(() => {});
    });

    test.beforeEach(() => {
      test.skip(
        !hasClusterBackup,
        'cluster-backup component not enabled (no discovered policies)',
      );
    });

    test.afterAll(async () => {
      if (!hasClusterBackup) return;
      const oc = new OcCliService();
      await oc
        .run(
          `oc label configurationpolicy ${TEST_POLICY} -n ${CLUSTER_NAME} ${labelKeys.map((k) => `${k}-`).join(' ')} 2>/dev/null || true`,
        )
        .catch(() => {});
    });

    test('RHACM4K-63381: Labels on discovered and managed policy template details', async ({
      governancePage,
      policyTemplateDetailsPage,
      policyService,
      oc,
      page,
    }) => {
      await test.step(
        '1: Navigate to discovered policies and select policy',
        async () => {
          await governancePage.gotoDiscoveredPolicies();

          const policyLink = governancePage.getPolicyLink(TEST_POLICY);
          await expect(policyLink).toBeVisible({ timeout: 30_000 });
          await policyLink.click();
          await governancePage.waitForLoad();
        },
      );

      await test.step(
        '2: Verify Labels column shows dash on Clusters tab',
        async () => {
          await governancePage.clickClustersTab();

          // Poll until search index reflects unlabeled state
          // (handles re-runs where previous labels are still indexed)
          const consoleUrl = await oc.getConsoleUrl();
          const clustersRoute = GOV_ROUTES.discoveredByCluster(
            POLICY_API_GROUP,
            POLICY_API_VERSION,
            POLICY_KIND,
            TEST_POLICY,
          );
          await expect(async () => {
            await page
              .goto(`${consoleUrl}${clustersRoute}`)
              .catch(() => {});
            await governancePage.waitForLoad();
            const labelsCell =
              governancePage.getClusterLabelsCell(CLUSTER_NAME);
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
          await governancePage.getClusterLink(CLUSTER_NAME).click();
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
          await policyService.addLabels(
            TEST_POLICY,
            CLUSTER_NAME,
            TEST_LABELS,
          );

          const output = await policyService.getLabels(
            TEST_POLICY,
            CLUSTER_NAME,
          );
          expect(output).toContain('environment');
          expect(output).toContain('team');
        },
      );

      await test.step(
        '5: Verify Labels column shows labels after adding',
        async () => {
          const consoleUrl = await oc.getConsoleUrl();
          const route = GOV_ROUTES.discoveredByCluster(
            POLICY_API_GROUP,
            POLICY_API_VERSION,
            POLICY_KIND,
            TEST_POLICY,
          );

          // Poll until search collector re-indexes (up to 4 minutes)
          await expect(async () => {
            await page
              .goto(`${consoleUrl}${route}`)
              .catch(() => {});
            await governancePage.waitForLoad();
            const labelsCell =
              governancePage.getClusterLabelsCell(CLUSTER_NAME);
            await expect(labelsCell).not.toHaveText(
              GOV_LABELS.noLabels,
            );
          }).toPass({
            intervals: [10_000, 15_000, 20_000],
            timeout: 240_000,
          });

          // Verify label count is shown (compact: "N labels" button)
          const labelsCell =
            governancePage.getClusterLabelsCell(CLUSTER_NAME);
          const labelButton =
            labelsCell.getByRole('button');
          await expect(labelButton).toContainText(/\d+ labels?/);

          // Click label count button to open popover
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

          // Verify system labels are NOT shown in popover
          await expect(popover).not.toContainText('cluster-name=');
          await expect(popover).not.toContainText(
            'cluster-namespace=',
          );
          await expect(popover).not.toContainText(
            'policy.open-cluster-management.io/',
          );

          // Close popover by pressing Escape
          await page.keyboard.press('Escape');
        },
      );

      await test.step(
        '6: Verify Labels display on policy template details after adding',
        async () => {
          await governancePage.gotoDiscoveredPolicyClusters(
            POLICY_API_GROUP,
            POLICY_API_VERSION,
            POLICY_KIND,
            TEST_POLICY,
          );
          await governancePage.getClusterLink(CLUSTER_NAME).click();
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
          // Navigate directly to managed policy template details
          const consoleUrl = await oc.getConsoleUrl();
          const route = GOV_ROUTES.policyTemplateDetails(
            MANAGED_POLICY_NS,
            MANAGED_POLICY_NAME,
            CLUSTER_NAME,
            POLICY_API_GROUP,
            POLICY_API_VERSION,
            POLICY_KIND,
            MANAGED_TEMPLATE_NAME,
          );
          await page.goto(`${consoleUrl}${route}`);
          await policyTemplateDetailsPage.waitForLoad();

          const labelsValue =
            policyTemplateDetailsPage.getLabelsFieldValue();
          await expect(labelsValue).toBeVisible();
          // Managed policy template has only system labels → shows dash
          await expect(labelsValue).toHaveText(GOV_LABELS.noLabels);
        },
      );

      await test.step(
        '8: Verify Label filter on Clusters tab',
        async () => {
          await governancePage.gotoDiscoveredPolicyClusters(
            POLICY_API_GROUP,
            POLICY_API_VERSION,
            POLICY_KIND,
            TEST_POLICY,
          );

          const labelFilterBtn =
            governancePage.getLabelFilterButton();
          await expect(labelFilterBtn).toBeVisible({
            timeout: 30_000,
          });

          // Equality filter: select environment=production
          await governancePage.openLabelFilter();
          await governancePage.selectLabelFilterValue(
            `environment=${TEST_LABELS.environment}`,
          );
          await governancePage.waitForLoad();

          const clusterRow =
            governancePage.getClusterRow(CLUSTER_NAME);
          await expect(clusterRow).toBeVisible();

          // Clear and verify full list restores
          await governancePage.clearAllFilters();
          await expect(clusterRow).toBeVisible();

          // Inequality filter: toggle to != mode (also applies filter)
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
