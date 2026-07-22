import { Page, expect } from '@playwright/test';
import { PF_SPINNER, PF_SKELETON } from '@constants/selectors';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  getPage(): Page {
    return this.page;
  }

  /**
   * Wait for PatternFly loading indicators to disappear.
   * @param timeout — override the default expect timeout (ms) for slow-loading pages
   */
  async waitForLoad(timeout = 60000): Promise<void> {
    await expect(this.page.locator(PF_SPINNER)).toHaveCount(0, { timeout });
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0, { timeout });
  }
}
