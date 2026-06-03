/**
 * Subscription create wizard — cluster placement section assertions (RHACM4K-64215).
 * Locators stay on {@link SubscriptionApplicationCreateWizardPage}; expects live here.
 */
import { expect, type Locator, type Page } from '@playwright/test';

import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

function escapeRegExpForMenuLabel(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getOpenSelectMenu(page: Page): Locator {
  return page
    .locator('[role="listbox"]:visible')
    .or(page.locator('.pf-v6-c-menu:visible'))
    .first();
}

function getOpenSelectMenuOptionMatches(page: Page, optionText: string): Locator {
  const nameRe = new RegExp(escapeRegExpForMenuLabel(optionText), 'i');
  const menu = getOpenSelectMenu(page);
  return menu
    .locator('.pf-v6-c-menu__item')
    .filter({ hasText: nameRe })
    .or(menu.getByRole('option', { name: nameRe }))
    .or(menu.locator('[class*="menu__list-item"]').filter({ hasText: nameRe }))
    .or(menu.locator('[class*="c-menu__item"]').filter({ hasText: nameRe }));
}

export async function verifySubscriptionWizardNamespaceSelected(
  wizard: SubscriptionApplicationCreateWizardPage,
  namespace: string
): Promise<void> {
  await expect(wizard.getNamespaceInput()).toHaveValue(namespace);
}

export async function verifyPlacementRuleDeprecationAlertNotVisibleInRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex = 0
): Promise<void> {
  await expect(wizard.getPlacementRuleDeprecationAlertInRepositoryBlock(blockIndex)).toBeHidden();
}

/** Select **existing placement configuration** (radio on current hubs, legacy checkbox otherwise). */
export async function enableExistingPlacementConfigurationInRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex = 0
): Promise<void> {
  const radio = wizard.getExistingPlacementConfigurationRadioForRepositoryBlock(blockIndex);
  if (await radio.count()) {
    if (!(await radio.isChecked())) {
      await radio.click();
    }
  } else {
    const legacyCheckbox = wizard.getExistingPlacementRuleCheckboxInRepositoryBlock(blockIndex);
    await legacyCheckbox.waitFor({ state: 'visible', timeout: 30_000 });
    if (!(await legacyCheckbox.isChecked())) {
      await legacyCheckbox.check();
    }
  }
  await expect(wizard.getExistingPlacementComboInRepositoryBlock(blockIndex)).toBeVisible();
}

export async function verifyExistingPlacementDropdownOptionsInRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  options: { visible: readonly string[]; notVisible: readonly string[] }
): Promise<void> {
  const combo = wizard.getExistingPlacementComboInRepositoryBlock(blockIndex);
  await combo.click();
  await wizard.waitForLoad();

  const page = combo.page();
  for (const name of options.visible) {
    await expect(getOpenSelectMenuOptionMatches(page, name).first()).toBeVisible();
  }
  for (const name of options.notVisible) {
    await expect(getOpenSelectMenuOptionMatches(page, name)).toHaveCount(0);
  }

  await page.keyboard.press('Escape').catch(() => undefined);
  await wizard.waitForLoad();
}
