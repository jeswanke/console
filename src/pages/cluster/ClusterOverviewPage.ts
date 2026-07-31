import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

const DESCRIPTION_LIST = '.pf-v6-c-description-list';

export class ClusterOverviewPage extends BasePage {
  constructor(page: Page) {
    super(page);
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
}
