import { Page, expect } from '@playwright/test';
import { PF_EMPTY_STATE, PF_SPINNER } from '@constants/selectors';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Wait until the ACM full-page loading EmptyState is gone.
   *
   * ACM renders page load via `LoadingPage` / `AcmLoadingPage` — a PF EmptyState
   * with a Spinner icon. Component-level spinners/skeletons elsewhere on the page
   * are ignored.
   *
   * @param timeout — override the default expect timeout (ms) for slow-loading pages
   */
  async waitForLoad(timeout = 60000): Promise<void> {
    const acmLoadingPage = this.page
      .locator(PF_EMPTY_STATE)
      .filter({ has: this.page.locator(PF_SPINNER) });
    await expect(acmLoadingPage).toHaveCount(0, { timeout });
  }
}
