import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { PF_SKELETON } from '@constants/selectors';
import { AcmTable } from '@components/patternfly/AcmTable';
import { ClusterTable } from '@components/cluster/ClusterTable';
import { ManageColumnsDialog } from '@components/patternfly/ManageColumnsDialog';
import { OcCliService } from '@services/OcCliService';
import { SELECTORS } from '@constants/selectors';
import { CLUSTER_MANAGE_COLUMNS } from '@constants/cluster';
import { CLUSTER_ROW_ACTIONS } from '@constants/cluster-create';
import { pageUrlPathnameEquals } from '@lib/navigation';

export class ClusterListPage extends BasePage {
  readonly table: AcmTable;
  private readonly clusterTable: ClusterTable;
  readonly manageColumns: ManageColumnsDialog;
  private readonly createButton: Locator;
  private readonly importButton: Locator;
  private readonly manageColumnsButton: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService,
  ) {
    super(page);
    this.table = new AcmTable(page);
    this.clusterTable = new ClusterTable(page);
    this.manageColumns = new ManageColumnsDialog(page);
    this.createButton = page.locator(SELECTORS.cluster.createButton);
    this.importButton = page.locator(SELECTORS.cluster.importButton);
    this.manageColumnsButton = page.locator(
      `button[aria-label="${CLUSTER_MANAGE_COLUMNS.buttonAriaLabel}"]`,
    );
  }

  // Cluster list has persistent status spinners (e.g. Creating/Destroying indicators)
  // that never reach count=0 — skip the global spinner check, rely on skeleton only.
  override async waitForLoad(timeout = 30000): Promise<void> {
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0, { timeout });
  }

  private static readonly managedClustersPath = '/multicloud/infrastructure/clusters/managed';

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, ClusterListPage.managedClustersPath)) {
      await this.waitForLoad();
      await this.dismissWelcomeModal();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${ClusterListPage.managedClustersPath}`);
    await this.waitForLoad();
    await this.dismissWelcomeModal();
  }

  private async dismissWelcomeModal(): Promise<void> {
    const closeButton = this.page.getByRole('dialog').getByRole('button', { name: 'Close' });
    const visible = await closeButton.waitFor({ state: 'visible', timeout: 2_000 }).then(() => true).catch(() => false);
    if (visible) {
      await closeButton.click();
    }
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  async clickImport(): Promise<void> {
    await this.importButton.click();
  }

  getColumnHeader(name: string): Locator {
    return this.clusterTable.getColumnHeader(name);
  }

  getPopoverBody(): Locator {
    return this.clusterTable.getPopoverBody();
  }

  getObservabilityMetricsLink(): Locator {
    return this.clusterTable.getObservabilityMetricsLink();
  }

  async getColumnValues(columnLabel: string): Promise<string[]> {
    return this.clusterTable.getColumnValues(columnLabel);
  }

  async forceNativeTableLayout(): Promise<void> {
    return this.clusterTable.forceNativeTableLayout();
  }

  // ---------------------------------------------------------------------------
  // Search & row actions
  // ---------------------------------------------------------------------------

  async searchCluster(name: string): Promise<void> {
    const searchInput = this.page.getByPlaceholder('Search');
    await searchInput.fill(name);
    await this.page.getByRole('row', { name }).waitFor({ state: 'visible', timeout: 15_000 });
  }

  async openRowActions(clusterName: string): Promise<void> {
    const row = this.page.getByRole('row', { name: clusterName });
    await row.getByRole('button', { name: 'Actions' }).click();
  }

  getRowActionItem(menuItemId: string): Locator {
    return this.page.locator(menuItemId);
  }

  // ---------------------------------------------------------------------------
  // Edit labels modal
  // ---------------------------------------------------------------------------

  async openEditLabels(clusterName: string): Promise<void> {
    await this.searchCluster(clusterName);
    await this.openRowActions(clusterName);
    const editLabels = this.getRowActionItem(CLUSTER_ROW_ACTIONS.editLabels);
    await expect(editLabels).toBeEnabled({ timeout: 10_000 });
    await editLabels.click();
  }

  async addLabel(label: string): Promise<void> {
    const labelInput = this.page.locator('input[id="labels-input"]');
    await labelInput.fill(label);
    await labelInput.press('Enter');
    await this.page.locator('button[type="submit"]').click();
  }

  // ---------------------------------------------------------------------------
  // Column management
  // ---------------------------------------------------------------------------

  async openManageColumns(): Promise<void> {
    await this.manageColumnsButton.click();
  }

  getManageColumnsModal(): Locator {
    return this.page.getByRole('dialog', {
      name: CLUSTER_MANAGE_COLUMNS.modalTitle,
    });
  }

  getColumnCheckbox(columnId: string): Locator {
    return this.getManageColumnsModal().locator(
      `#${CLUSTER_MANAGE_COLUMNS.checkboxId(columnId)}`,
    );
  }

  async saveManageColumns(): Promise<void> {
    await this.getManageColumnsModal()
      .getByRole('button', {
        name: CLUSTER_MANAGE_COLUMNS.saveButton,
      })
      .click();
  }
}
