/**
 * Cluster detach — discover imported e2e clusters by label, detach via UI.
 *
 * Cleanup counterpart to cluster-import. Discovers clusters by
 * `owner=acmqe-e2e-auto` + `clc-e2e=true` labels, filtered by vendor label
 * to match imported (non-Hive) cluster types.
 *
 * Filter platforms at runtime:
 *   CLC_IMPORT_TYPES=eks,aks npx playwright test --project=cluster -g "Cluster Detach"
 */
import { test, expect } from '@fixtures/acm-test';
import { IMPORT_PLATFORM_TYPES } from '@constants/cluster-import';
import { detachClusterViaUI } from '@lib/cluster/detach-cluster';
import { waitForClusterDetached } from '@lib/cluster/wait-for-cluster-ready';

const typeFilter = process.env.CLC_IMPORT_TYPES
  ?.split(',')
  .map((t) => t.trim().toLowerCase())
  .filter(Boolean);

const platforms = IMPORT_PLATFORM_TYPES
  .filter((p) => !typeFilter || typeFilter.includes(p.key));

test.describe('Cluster Detach', { tag: ['@cluster', '@clc', '@detach'] }, () => {
  for (const platform of platforms) {
    test(
      `${platform.detachTestId}: Detach ${platform.key.toUpperCase()} clusters`,
      { tag: [`@${platform.detachTestId}`, `@${platform.key}`] },
      async ({ page, oc, clusterListPage }) => {
        test.setTimeout(600_000);

        const labelSelector =
          `owner=acmqe-e2e-auto,clc-e2e=true,vendor=${platform.vendor},name!=local-cluster`;

        const clusters = await test.step('Discover clusters by label', async () => {
          const names = await oc.getManagedClustersByLabel(labelSelector);
          test.skip(names.length === 0, `No ${platform.key} e2e clusters to detach`);
          return names;
        });

        for (const clusterName of clusters) {
          await test.step(`Detach ${clusterName} via UI`, async () => {
            await detachClusterViaUI(page, clusterListPage, clusterName);
          });

          await test.step(`Wait for ${clusterName} detach`, async () => {
            await waitForClusterDetached(oc, clusterName, { timeout: 5 * 60_000 });
          });

          await test.step(`Verify ${clusterName} gone from UI`, async () => {
            await clusterListPage.goto();
            const row = page.getByRole('row', { name: clusterName });
            await expect(row).not.toBeVisible({ timeout: 10_000 });
          });
        }
      },
    );
  }
});
