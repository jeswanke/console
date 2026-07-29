import { OVERVIEW_PAGE, OVERVIEW_ROUTES } from '@constants/overview';
import { pageUrlPathnameEquals } from '@lib/navigation';
import { BasePage } from '@pages/BasePage';
import { Locator, Page, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';

/** ACM Overview page (`/multicloud/home/overview`). */
export class OverviewPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, OVERVIEW_ROUTES.page)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${OVERVIEW_ROUTES.page}`);
    await this.waitForLoad();
  }

  getPageTitle(): Locator {
    return this.page.getByRole('heading', { name: OVERVIEW_PAGE.title, level: 1 });
  }

  // ---------------------------------------------------------------------------
  // Cluster selector
  // ---------------------------------------------------------------------------

  async selectClusterLabelKey(): Promise<void> {
    await this.page.locator(`#${OVERVIEW_PAGE.clusterSelector.clusterLabelKeyInputId}`).click();
    await expect(this.page.locator('.pf-v6-c-menu')).toBeVisible();
    await this.page
      .getByRole('option', { name: OVERVIEW_PAGE.clusterSelector.localClusterLabel })
      .click();
    await expect(this.page.locator('.pf-v6-c-menu')).toBeHidden();
  }

  async selectClusterLabelValue(): Promise<void> {
    await this.page.locator(`#${OVERVIEW_PAGE.clusterSelector.clusterLabelValueInputId}`).click();
    await expect(this.page.locator('.pf-v6-c-menu')).toBeVisible();
    await this.page
      .getByRole('menuitem', { name: OVERVIEW_PAGE.clusterSelector.localClusterValue })
      .click();
  }

  /** Returns the active filter chip/label for the local-cluster filter. */
  /** Returns the "true" chip inside the local-cluster label group. */
  getLocalClusterFilterChip(): Locator {
    return this.page
      .locator('.pf-v6-c-label-group.pf-m-category')
      .filter({ hasText: OVERVIEW_PAGE.clusterSelector.localClusterLabel })
      .locator('.pf-v6-c-label__text', {
        hasText: OVERVIEW_PAGE.clusterSelector.localClusterValue,
      });
  }

  // ---------------------------------------------------------------------------
  // Summary section
  // ---------------------------------------------------------------------------

  getClustersCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.summary.clustersCardTitle);
  }

  getAppTypesCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.summary.appTypesCardTitle);
  }

  getPoliciesCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.summary.policiesCardTitle);
  }

  getClusterVersionCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.summary.clusterVersionCardTitle);
  }

  getNodesCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.summary.nodesCardTitle);
  }

  getWorkerCoreCountCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.summary.workerCoreCountCardTitle);
  }

  // ---------------------------------------------------------------------------
  // Insights section
  // ---------------------------------------------------------------------------

  getInsightsSectionHeading(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.insights.sectionLabel, { exact: true });
  }

  getClusterRecommendationCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.insights.clusterRecommendationCardTitle);
  }

  getUpgradeRiskPredictionCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.insights.upgradeRiskPredictionCardTitle);
  }

  // ---------------------------------------------------------------------------
  // Cluster Health section
  // ---------------------------------------------------------------------------

  getClusterHealthSectionHeading(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.clusterHealth.sectionLabel);
  }

  getStatusCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.clusterHealth.statusCardTitle);
  }

  getViolationsCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.clusterHealth.violationsCardTitle);
  }

  getClusterAddonsCard(): Locator {
    return this.page
      .locator('.pf-v6-c-card__title-text')
      .getByText(OVERVIEW_PAGE.clusterHealth.clusterAddonsCardTitle);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async waitForOverviewReady(): Promise<void> {
    await expect(this.getPageTitle()).toBeVisible({ timeout: 60_000 });
    await this.waitForLoad();
  }
}
