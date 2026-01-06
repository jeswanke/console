import { test, expect } from '@fixtures/acm-test';

test.describe('Cluster List Page', () => {
  test('should display the local-cluster in the list', async ({ clusterListPage }) => {
    // 1. Navigate to the Cluster List page
    await clusterListPage.goto();

    // 2. Search for the 'local-cluster' (default in ACM)
    const clusterName = 'local-cluster';
    await clusterListPage.searchCluster(clusterName);

    // 3. Verify the cluster is visible in the table
    await clusterListPage.verifyClusterVisible(clusterName);
  });

  test('should allow searching for a non-existent cluster', async ({ clusterListPage, uniqueName }) => {
    await clusterListPage.goto();

    // Search for a random unique name that won't exist
    await clusterListPage.searchCluster(uniqueName);

    // Verify empty state message
    await clusterListPage.verifyNoResultsFound();
  });
});


