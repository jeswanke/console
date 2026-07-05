import { Page, Locator } from '@playwright/test';

export class StatusFilter {
  constructor(private readonly page: Page) {}

  getStatusButton(): Locator {
    return this.page.getByRole('button', { name: /^Status/ }).first();
  }

  async selectStatus(status: string): Promise<void> {
    await this.getStatusButton().click();
    await this.page.getByRole('menuitem', { name: status }).click();
    await this.page.keyboard.press('Escape');
  }

  async clearAllFilters(): Promise<void> {
    const clearBtn = this.page.getByRole('button', { name: 'Clear all filters' });
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
    } else {
      const closeChip = this.page.getByRole('button', { name: /^Close/ }).first();
      if (await closeChip.isVisible().catch(() => false)) {
        await closeChip.click();
      }
    }
  }
}
