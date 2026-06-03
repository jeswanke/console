import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { ClusterTable } from '@components/cluster/ClusterTable';
import { OcCliService } from '@services/OcCliService';
import { CLUSTER_ROUTES } from '@constants/cluster';


export class ClusterNodesPage extends BasePage {
  readonly clusterTable: ClusterTable;

  constructor(
    page: Page,
    private readonly oc: OcCliService,
  ) {
    super(page);
    this.clusterTable = new ClusterTable(page);
  }

  async goto(namespace: string, name: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(
      `${consoleUrl}${CLUSTER_ROUTES.nodes(namespace, name)}`,
    );
    await this.waitForLoad();
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
}
