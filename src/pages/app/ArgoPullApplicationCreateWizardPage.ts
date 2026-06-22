import { expect, type Locator, type Page } from '@playwright/test';

import type { OcCliService } from '@services/OcCliService';
import {
  APP_ARGO_PULL_CREATE_WIZARD,
  APP_CREATE_MENU,
  APP_ROUTES,
} from '@constants/app';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import type { FillArgoAppsetBeforePlacementOptions } from '@lib/app/argo/fill-wizard-before-placement';
import { fillArgoAppsetWizardBeforePlacement } from '@lib/app/argo/fill-wizard-before-placement';

/**
 * Argo CD ApplicationSet **pull model** create wizard.
 *
 * Shares wizard actions with {@link ArgoPushApplicationCreateWizardPage}; only entry route and title differ.
 */
export class ArgoPullApplicationCreateWizardPage extends ArgoPushApplicationCreateWizardPage {
  constructor(page: Page, oc: OcCliService) {
    super(page, oc, '__argoPullWizardYamlCopy');
  }

  override getPageTitle(): Locator {
    return this.page.getByRole('heading', {
      name: APP_ARGO_PULL_CREATE_WIZARD.pageTitle,
      level: 1,
    });
  }

  override async openFromApplicationsList(listPage: ApplicationListPage): Promise<void> {
    await listPage.goto();
    await listPage.openCreateApplication();
    await this.page.locator(`#${APP_CREATE_MENU.optionIds.argoPullModel}`).click();
    await this.waitForLoad();
    await this.getPageTitle().waitFor({ state: 'visible', timeout: 120_000 });
    await this.getArgoServerCombobox().waitFor({ state: 'visible', timeout: 60_000 });
  }

  override async expectOnCreateRoute(): Promise<void> {
    await expect(this.page).toHaveURL(`**${APP_ROUTES.createArgoPull}`);
  }

  /** General → Sync policy, then **Placement** (RHACM4K-64219). */
  async fillStepsBeforePlacement(options: FillArgoAppsetBeforePlacementOptions): Promise<void> {
    await fillArgoAppsetWizardBeforePlacement(this.page, options);
    await this.waitForLoad();
  }
}
