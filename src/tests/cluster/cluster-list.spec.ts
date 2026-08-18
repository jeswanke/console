/**
 * Cluster list — **sample / exploratory** coverage.
 *
 * Not part of integration runs (`PLAYWRIGHT_TEST_MODE=integration` ignores this file).
 * Run locally: `./start.sh clc --grep @sample` or `npx playwright test cluster-list.spec.ts --project cluster`.
 */
import { test } from '@fixtures/acm-test';
import { getHubClusterName } from '@lib/cluster/hub-cluster';

test.describe('Cluster List Page', { tag: ['@clc', '@sample'] }, () => {
  test('should display the local-cluster in the list', async ({ clusterListPage, oc }) => {
    const hubClusterName = await getHubClusterName(oc);
    await clusterListPage.goto();
    await clusterListPage.table.search(hubClusterName);
    await clusterListPage.table.verifyRowVisible(hubClusterName);
  });

  test('should show empty state for non-existent cluster', async ({
    clusterListPage,
    uniqueName,
  }) => {
    await clusterListPage.goto();
    await clusterListPage.table.search(uniqueName);
    await clusterListPage.table.verifyEmpty();
  });
});
