import { ClusterTable } from '@components/cluster/ClusterTable';
import { AcmTable } from '@components/patternfly/AcmTable';
import { ManageColumnsDialog } from '@components/patternfly/ManageColumnsDialog';
import {
  CLUSTER_MANAGE_COLUMNS,
  CLUSTER_ONBOARDING_LOCAL_STORAGE_KEY,
  CLUSTER_SELECTORS,
} from '@constants/cluster';
import { CLUSTER_ROW_ACTIONS } from '@constants/cluster-create';
import { SELECTORS } from '@constants/selectors';
import { pageUrlPathnameEquals } from '@lib/navigation';
import { BasePage } from '@pages/BasePage';
import { Locator, Page, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';

export class ClusterListPage extends BasePage {
  readonly table: AcmTable;
  private readonly clusterTable: ClusterTable;
  readonly manageColumns: ManageColumnsDialog;
  private readonly createButton: Locator;
  private readonly importButton: Locator;
  private readonly manageColumnsButton: Locator;
  private onboardingGuardsInstalled = false;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.table = new AcmTable(page, 'Clusters table');
    this.clusterTable = new ClusterTable(page);
    this.manageColumns = new ManageColumnsDialog(page);
    this.createButton = page.locator(SELECTORS.cluster.createButton);
    this.importButton = page.locator(SELECTORS.cluster.importButton);
    this.manageColumnsButton = page.locator(
      `button[aria-label="${CLUSTER_MANAGE_COLUMNS.buttonAriaLabel}"]`
    );
  }

  private static readonly managedClustersPath = '/multicloud/infrastructure/clusters/managed';

  /**
   * Prevent ManagedClusters OnboardingModal from blocking actions:
   * 1. Seed localStorage so the product never opens it on subsequent loads
   * 2. Register a locator handler as a zero-cost fallback if it still appears
   *    (runs only when Playwright hits the overlay during an action/assertion)
   */
  private async installOnboardingGuards(): Promise<void> {
    if (this.onboardingGuardsInstalled) return;

    const key = CLUSTER_ONBOARDING_LOCAL_STORAGE_KEY;
    await this.page.addInitScript((storageKey) => {
      try {
        localStorage.setItem(storageKey, 'hide');
      } catch {
        // ignore (private mode / opaque origins)
      }
    }, key);

    await this.page.addLocatorHandler(
      this.page.locator(CLUSTER_SELECTORS.onboardingModal),
      async () => {
        const close = this.page
          .locator(CLUSTER_SELECTORS.onboardingModal)
          .getByRole('button', { name: 'Close' });
        if (await close.isVisible()) await close.click();
        else await this.page.keyboard.press('Escape');
      }
    );

    this.onboardingGuardsInstalled = true;
  }

  async goto(): Promise<void> {
    await this.installOnboardingGuards();

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
    return this.getManageColumnsModal().locator(`#${CLUSTER_MANAGE_COLUMNS.checkboxId(columnId)}`);
  }

  async saveManageColumns(): Promise<void> {
    await this.getManageColumnsModal()
      .getByRole('button', {
        name: CLUSTER_MANAGE_COLUMNS.saveButton,
      })
      .click();
  }
}
