import { expect, type Page } from '@playwright/test';

import {
  ARGO_WIZARD_MORE_INFO_BUTTON,
  type ArgoWizardTooltipDef,
} from '@constants/argo-wizard-tooltips';
import {
  APP_ARGO_CREATE_WIZARD_SHARED,
} from '@constants/app';
import type { ArgoGeneratorDisplayName } from '@constants/argo-appset-generators';
import {
  addArgoGenerator,
  removeArgoGeneratorAt,
} from '@lib/app/argo/generator-wizard-actions';
import type { ArgoPullApplicationCreateWizardPage } from '@pages/app/ArgoPullApplicationCreateWizardPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';

/** Click **More info**, assert popover body text, close popover (RHACM4K-61725). */
export async function verifyArgoWizardTooltip(page: Page, def: ArgoWizardTooltipDef): Promise<void> {
  const texts = Array.isArray(def.expectedText) ? def.expectedText : [def.expectedText];
  const help = page.locator(def.helpButtonSelector).first();
  await help.scrollIntoViewIfNeeded();
  await help.click({ force: true });
  const body = page.locator(def.popoverBodySelector).first();
  await expect(body).toBeVisible({ timeout: 10_000 });
  for (const text of texts) {
    await expect(body).toContainText(text);
  }
  const close = body.locator('xpath=ancestor::*[@role="dialog" or contains(@class,"popover")][1]').getByRole('button', { name: 'Close' });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press('Escape');
  }
}

export async function assertGeneratorBlockHasNoMoreInfo(page: Page, headingPattern: RegExp): Promise<void> {
  const block = page
    .locator('div#generators')
    .getByRole('heading', { level: 6, name: headingPattern })
    .last()
    .locator('xpath=ancestor::div[.//button[@aria-label="Remove item"]][1]/..');
  await expect(block.locator(ARGO_WIZARD_MORE_INFO_BUTTON)).toHaveCount(0);
}

export async function switchPullWizardSecondGenerator(
  page: Page,
  generatorDisplayName: ArgoGeneratorDisplayName
): Promise<void> {
  await removeArgoGeneratorAt(page, 2);
  await addArgoGenerator(page, generatorDisplayName);
}

export async function openArgoPullWizardGeneralStep(
  applicationListPage: ApplicationListPage,
  pullWizard: ArgoPullApplicationCreateWizardPage
): Promise<void> {
  await applicationListPage.goto();
  await pullWizard.openFromApplicationsList(applicationListPage);
  await expect(pullWizard.getPageTitle()).toBeVisible();
}

export async function selectPullWizardRepositoryGit(page: Page): Promise<void> {
  const W = APP_ARGO_CREATE_WIZARD_SHARED;
  const gitTile = page
    .locator('[data-ouia-component-type="PF6/Card"]')
    .filter({ hasText: W.template.gitRepositoryTypeCardText })
    .first();
  if (await gitTile.isVisible().catch(() => false)) {
    await gitTile.click();
    return;
  }
  await page.locator('#tile-git').click({ force: true });
}

export async function selectPullWizardRepositoryHelm(page: Page): Promise<void> {
  const W = APP_ARGO_CREATE_WIZARD_SHARED;
  const helmTile = page
    .locator('[data-ouia-component-type="PF6/Card"]')
    .filter({ hasText: W.template.helmRepositoryTypeCardText })
    .first();
  if (await helmTile.isVisible().catch(() => false)) {
    await helmTile.click();
    return;
  }
  await page.locator('#tile-helm').click({ force: true });
}
