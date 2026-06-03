import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { AcmTable } from '@components/patternfly/AcmTable';
import { ClusterTable } from '@components/cluster/ClusterTable';
import { ManageColumnsDialog } from '@components/patternfly/ManageColumnsDialog';
import { OcCliService } from '@services/OcCliService';
import { SELECTORS } from '@constants/selectors';
import { CLUSTER_MANAGE_COLUMNS } from '@constants/cluster';
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

  private static readonly managedClustersPath = '/multicloud/infrastructure/clusters/managed';

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, ClusterListPage.managedClustersPath)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${ClusterListPage.managedClustersPath}`);
    await this.waitForLoad();
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
