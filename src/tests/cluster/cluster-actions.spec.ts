/**
 * Cluster actions — label verification, editing, and auto-recovery.
 *
 * Runs against local-cluster (always available on any hub).
 * Migrated from: clc-ui-e2e/cypress/tests/clusters/managedClusters/clusterAction.spec.js
 */
import { test, expect } from '@fixtures/acm-test';

const CLUSTER_NAME = 'local-cluster';
const TEST_LABEL_KEY = 'clc-qe';
const TEST_LABEL_VALUE = 'automation';
const TEST_LABEL = `${TEST_LABEL_KEY}=${TEST_LABEL_VALUE}`;

test.describe('Cluster Actions', { tag: ['@cluster', '@clc', '@actions'] }, () => {
  test(
    'RHACM4K-1737: Verify labels match cluster info',
    { tag: ['@RHACM4K-1737'] },
    async ({ oc, clusterOverviewPage }) => {
      const labels = await test.step('Get labels from CLI', async () => {
        return oc.getManagedClusterLabels(CLUSTER_NAME);
      });

      await test.step('Navigate to cluster overview', async () => {
        await clusterOverviewPage.goto(CLUSTER_NAME, CLUSTER_NAME);
      });

      await test.step('Verify labels visible in UI', async () => {
        const labelKeys = Object.keys(labels).slice(0, 10);
        for (const key of labelKeys) {
          const labelText = `${key}=${labels[key]}`;
          await expect(clusterOverviewPage.getLabel(labelText)).toBeVisible();
        }
      });
    }
  );

  test(
    'RHACM4K-1588: Edit labels via UI',
    { tag: ['@RHACM4K-1588'] },
    async ({ oc, clusterListPage }) => {
      await test.step('Navigate to cluster list', async () => {
        await clusterListPage.goto();
      });

      await test.step('Add test label via edit labels dialog', async () => {
        await clusterListPage.openEditLabels(CLUSTER_NAME);
        await clusterListPage.addLabel(TEST_LABEL);
      });

      await test.step('Verify label via CLI', async () => {
        await expect(async () => {
          const value = await oc.getManagedClusterLabel(CLUSTER_NAME, TEST_LABEL_KEY);
          expect(value).toBe(TEST_LABEL_VALUE);
        }).toPass({ timeout: 10_000 });
      });

      await test.step('Cleanup: remove test label', async () => {
        await oc.removeManagedClusterLabel(CLUSTER_NAME, TEST_LABEL_KEY);
      });
    }
  );

  test(
    'RHACM4K-8321: Built-in label auto-recovery',
    { tag: ['@RHACM4K-8321'] },
    async ({ oc, clusterOverviewPage }) => {
      await test.step('Remove the name label via CLI', async () => {
        await oc.removeManagedClusterLabel(CLUSTER_NAME, 'name');
      });

      await test.step('Verify label is auto-recovered', async () => {
        await expect(async () => {
          const value = await oc.getManagedClusterLabel(CLUSTER_NAME, 'name');
          expect(value).toBe(CLUSTER_NAME);
        }).toPass({ timeout: 30_000, intervals: [2_000] });
      });

      await test.step('Verify in UI', async () => {
        await clusterOverviewPage.goto(CLUSTER_NAME, CLUSTER_NAME);
        await expect(
          clusterOverviewPage.getLabel(`name=${CLUSTER_NAME}`)
        ).toBeVisible();
      });
    }
  );
});
