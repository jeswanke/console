import { Page, expect } from '@playwright/test';
import type { ClusterListPage } from '@pages/cluster/ClusterListPage';
import { CLUSTER_ROW_ACTIONS, CLUSTER_MODAL } from '@constants/cluster-create';

export async function destroyClusterViaUI(
  page: Page,
  clusterListPage: ClusterListPage,
  clusterName: string,
): Promise<void> {
  await clusterListPage.goto();
  await clusterListPage.searchCluster(clusterName);
  await clusterListPage.openRowActions(clusterName);

  const destroyItem = clusterListPage.getRowActionItem(CLUSTER_ROW_ACTIONS.destroy);
  await destroyItem.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  await dialog.locator(CLUSTER_MODAL.confirmInput).fill(clusterName);

  const destroyButton = dialog.getByRole('button', { name: 'Destroy', exact: true });
  await expect(destroyButton).toBeEnabled({ timeout: 5_000 });
  await destroyButton.click();
}
