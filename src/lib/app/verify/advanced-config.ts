/**
 * Applications → Advanced configuration tab assertions (RHACM4K-64170).
 * Locators stay on {@link ApplicationListPage}; expects live here.
 */
import { expect } from '@playwright/test';

import { APP_ADVANCED_CONFIG, APP_DOCS_ADVANCED_DEPRECATION_HREF_RE } from '@constants/app';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';

export async function verifyAdvancedDeprecationBanner(
  applicationListPage: ApplicationListPage
): Promise<void> {
  const { deprecationBanner } = APP_ADVANCED_CONFIG;
  const banner = applicationListPage.getAdvancedDeprecationAlert();
  await expect(banner).toBeVisible();
  for (const snippet of Object.values(deprecationBanner.bodySnippets)) {
    await expect(banner).toContainText(snippet);
  }
  const learnMore = applicationListPage.getAdvancedDeprecationLearnMoreLink();
  await expect(learnMore).toBeVisible();
  await expect(learnMore).toHaveAttribute('href', APP_DOCS_ADVANCED_DEPRECATION_HREF_RE);
}

export async function verifyAdvancedConfigTabSelected(
  applicationListPage: ApplicationListPage
): Promise<void> {
  await expect(applicationListPage.getAdvancedConfigTab()).toHaveAttribute('aria-selected', 'true');
}

export async function ensureAdvancedTerminologyCardExpanded(
  applicationListPage: ApplicationListPage
): Promise<void> {
  const card = applicationListPage.getAdvancedConfigContent();
  const subscriptionsTerm = card.getByText(
    APP_ADVANCED_CONFIG.terminologyCard.termTitles.subscriptions,
    { exact: true }
  );
  if (await subscriptionsTerm.isVisible().catch(() => false)) {
    return;
  }
  await applicationListPage.getAdvancedTerminologyCardTitle().click();
  await applicationListPage.waitForLoad();
  await expect(subscriptionsTerm).toBeVisible();
}

export async function verifyAdvancedConfigTerminologyExcludesPlacementRules(
  applicationListPage: ApplicationListPage
): Promise<void> {
  const card = applicationListPage.getAdvancedConfigContent();
  const { termTitles, removedTermTitlePattern } = APP_ADVANCED_CONFIG.terminologyCard;
  await expect(card.getByText(termTitles.subscriptions, { exact: true })).toBeVisible();
  await expect(card.getByText(termTitles.channels, { exact: true })).toBeVisible();
  await expect(card.getByText(removedTermTitlePattern)).toHaveCount(0);
}

export async function verifyAdvancedConfigResourceTabsExcludePlacementRules(
  applicationListPage: ApplicationListPage
): Promise<void> {
  await expect(applicationListPage.getAdvancedResourceToggleButton('subscriptions')).toBeVisible();
  await expect(applicationListPage.getAdvancedResourceToggleButton('channels')).toBeVisible();

  const page = applicationListPage.getAdvancedResourceToggleButton('subscriptions').page();
  for (const id of APP_ADVANCED_CONFIG.resourceToggle.removedToggleIds) {
    await expect(page.locator(`#${id}`)).toHaveCount(0);
  }

  const toggleGroup = applicationListPage.getAdvancedResourceToggleButton('subscriptions').locator('..');
  await expect(
    toggleGroup.getByRole('button', {
      name: APP_ADVANCED_CONFIG.resourceToggle.removedTabLabelPattern,
    })
  ).toHaveCount(0);
}
