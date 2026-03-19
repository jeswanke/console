import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';
import { AcmTable } from '@components/patternfly/AcmTable';
import { OcCliService } from '@services/OcCliService';

/**
 * Cluster Sets page — reuses {@link AcmTable}.
 */
export class ClusterSetsPage extends BasePage {
  readonly table: AcmTable;
  private readonly createButton: Locator;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.table = new AcmTable(page);
    this.createButton = page.getByRole('button', { name: 'Create cluster set' });
  }

  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}/multicloud/infrastructure/clusters/sets`);
    await this.waitForLoad();
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }
}
