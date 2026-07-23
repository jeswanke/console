import { Locator, Page } from '@playwright/test';

import { WELCOME_PAGE, WELCOME_ROUTES } from '@constants/welcome';
import { pageUrlPathnameEquals } from '@lib/navigation';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';

export class WelcomePage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, WELCOME_ROUTES.page)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${WELCOME_ROUTES.page}`);
    await this.waitForLoad();
  }

  getPageTitle(): Locator {
    return this.page.getByRole('heading', { name: WELCOME_PAGE.title, level: 1 });
  }

  getCapabilityCards(): Locator {
    return this.page.locator('main a[href*="/multicloud"]').filter({
      has: this.page.locator('[class*="pf-v6-c-card"]'),
    });
  }

  getCapabilityCardByTitle(title: string): Locator {
    return this.getCapabilityCards().filter({ has: this.page.locator('[class*="card__title"]', { hasText: title }) });
  }

  getSearchCard(): Locator {
    return this.getCapabilityCardByTitle(WELCOME_PAGE.capabilityCards.search.title);
  }

  getConverseAndConnectHeading(): Locator {
    return this.page.getByRole('heading', {
      name: WELCOME_PAGE.converseAndConnect.heading,
      level: 2,
    });
  }

  getTechnicalCommunityLink(): Locator {
    return this.page.getByRole('link', {
      name: new RegExp(WELCOME_PAGE.converseAndConnect.technicalCommunity.title),
    });
  }

  getSupportCenterLink(): Locator {
    return this.page.getByRole('link', {
      name: new RegExp(WELCOME_PAGE.converseAndConnect.supportCenter.title),
    });
  }
}
