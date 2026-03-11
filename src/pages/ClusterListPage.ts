import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { AcmTable } from '@components/AcmTable';
import { OcCliService } from '@services/OcCliService';
import { SELECTORS } from '@constants/selectors';

export class ClusterListPage extends BasePage {
  readonly table: AcmTable;
  private readonly createButton: Locator;
  private readonly importButton: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.table = new AcmTable(page);
    this.createButton = page.locator(SELECTORS.cluster.createButton);
    this.importButton = page.locator(SELECTORS.cluster.importButton);
  }

  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}/multicloud/infrastructure/clusters/managed`);
    await this.waitForLoad();
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  async clickImport(): Promise<void> {
    await this.importButton.click();
  }
}
