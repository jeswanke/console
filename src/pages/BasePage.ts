import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Waits for the page to be fully loaded by checking for common ACM loading indicators
   * (Spinners, Skeletons, etc.).
   */
  async waitForLoad() {
    const spinner = this.page.locator('.pf-c-spinner, .pf-v5-c-spinner');
    const skeleton = this.page.locator('.pf-c-skeleton, .pf-v5-c-skeleton');
    
    // Wait for spinners and skeletons to disappear
    await expect(spinner).toHaveCount(0);
    await expect(skeleton).toHaveCount(0);
  }

  async goto(path: string) {
    await this.page.goto(path);
    await this.waitForLoad();
  }
}

