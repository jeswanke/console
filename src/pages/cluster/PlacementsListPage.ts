import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { PLACEMENT_LIST, PLACEMENT_ROUTES } from '@constants/placement';
import { pageUrlPathnameEquals } from '@lib/navigation';

/**
 * Infrastructure → Clusters → **Placements** tab.
 */
export class PlacementsListPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  getPlacementsTab(): Locator {
    return this.page.getByRole('tab', { name: PLACEMENT_LIST.placementsTabLabel }).first();
  }

  getCreatePlacementButton(): Locator {
    return this.page.getByRole('button', { name: PLACEMENT_LIST.createPlacementButtonLabel });
  }

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, PLACEMENT_ROUTES.placementsList)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${PLACEMENT_ROUTES.placementsList}`);
    await this.waitForLoad();
  }

  async openPlacementsTab(): Promise<void> {
    const tab = this.getPlacementsTab();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await this.waitForLoad();
    }
  }

  async clickCreatePlacement(): Promise<void> {
    await this.getCreatePlacementButton().click();
    await this.waitForLoad();
  }
}
