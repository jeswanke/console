import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { CLUSTER_ROUTES } from '@constants/cluster';

const DESCRIPTION_LIST = '.pf-v6-c-description-list';
const LABEL_GROUP = '[aria-label="Label group category"]';

export class ClusterOverviewPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService,
  ) {
    super(page);
  }

  async goto(namespace: string, name: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${CLUSTER_ROUTES.detailOverview(namespace, name)}`);
    await this.waitForLoad();
  }

  getStatusButton(status: string): Locator {
    return this.page.locator(DESCRIPTION_LIST).getByRole('button', { name: status });
  }

  getStatusText(pattern: RegExp): Locator {
    return this.page.locator(DESCRIPTION_LIST).getByText(pattern);
  }

  async expectOnOverviewPage(clusterName: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/clusters/details/.*/${clusterName}`), {
      timeout: 30_000,
    });
  }

  getLabel(labelText: string): Locator {
    return this.page.locator(LABEL_GROUP).getByText(labelText);
  }
}
