import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';
import { AcmTable } from '@components/patternfly/AcmTable';
import { OcCliService } from '@services/OcCliService';
import { pageUrlPathnameEquals } from '@lib/navigation';

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

  private static readonly managedSetsPath = '/multicloud/infrastructure/clusters/sets';

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, ClusterSetsPage.managedSetsPath)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${ClusterSetsPage.managedSetsPath}`);
    await this.waitForLoad();
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }
}
