import { test } from '@fixtures/acm-test';

test.describe('Cluster List Page', () => {
  test('should display the local-cluster in the list', async ({ clusterListPage }) => {
    await clusterListPage.goto();
    await clusterListPage.table.search('local-cluster');
    await clusterListPage.table.verifyRowVisible('local-cluster');
  });

  test('should show empty state for non-existent cluster', async ({ clusterListPage, uniqueName }) => {
    await clusterListPage.goto();
    await clusterListPage.table.search(uniqueName);
    await clusterListPage.table.verifyEmpty();
  });
});
