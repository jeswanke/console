import { Page, expect } from '@playwright/test';
import { PF_SPINNER, PF_SKELETON } from '@constants/selectors';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Wait for PatternFly loading indicators to disappear.
   */
  async waitForLoad(): Promise<void> {
    await expect(this.page.locator(PF_SPINNER)).toHaveCount(0, { timeout: 30000 });
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0, { timeout: 30000 });
  }
}
