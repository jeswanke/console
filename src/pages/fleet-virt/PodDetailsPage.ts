import { Locator, Page } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

/**
 * OCP Pod Details page — reached by clicking a pod link from VM Details Overview.
 *
 * Provides access to pod heading, Logs tab, and log viewer for verifying
 * pod log access (e.g., ACM-26537 cluster-proxy fix for RBAC users).
 */
export class PodDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getPodHeading(): Locator {
    return this.page.getByRole('heading', { name: /virt-launcher/i });
  }

  getLogsTab(): Locator {
    return this.page.getByRole('tab', { name: 'Logs' });
  }

  async clickLogsTab(): Promise<void> {
    await this.getLogsTab().click();
    await this.waitForLoad();
  }

  getLogViewer(): Locator {
    return this.page.locator('.pf-v6-c-log-viewer').or(
      this.page.locator('[class*="log-viewer"]'),
    );
  }
}
