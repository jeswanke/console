import { Page, expect } from '@playwright/test';
import type { ClusterListPage } from '@pages/cluster/ClusterListPage';
import { CLUSTER_ROW_ACTIONS, CLUSTER_MODAL } from '@constants/cluster-create';

export async function detachClusterViaUI(
  page: Page,
  clusterListPage: ClusterListPage,
  clusterName: string,
): Promise<void> {
  await clusterListPage.goto();
  await clusterListPage.searchCluster(clusterName);
  await clusterListPage.openRowActions(clusterName);

  const detachItem = clusterListPage.getRowActionItem(CLUSTER_ROW_ACTIONS.detach);
  await detachItem.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  await dialog.locator(CLUSTER_MODAL.confirmInput).fill(clusterName);

  const detachButton = dialog.getByRole('button', { name: 'Detach', exact: true });
  await expect(detachButton).toBeEnabled({ timeout: 5_000 });
  await detachButton.click();
}
