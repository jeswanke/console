import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { PLACEMENT_DETAILS, PLACEMENT_ROUTES } from '@constants/placement';
import { pageUrlPathnameEquals } from '@lib/navigation';

/** Infrastructure → Clusters → Placements → **{name}** Overview tab. */
export class PlacementDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  isOnPlacementOverview(namespace: string, name: string): boolean {
    return pageUrlPathnameEquals(this.page, PLACEMENT_ROUTES.detailsOverview(namespace, name));
  }

  async goto(namespace: string, name: string): Promise<void> {
    if (this.isOnPlacementOverview(namespace, name)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${PLACEMENT_ROUTES.detailsOverview(namespace, name)}`);
    await this.waitForLoad();
  }

  getPlacementHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  getOverviewTab(): Locator {
    return this.page.getByRole('tab', {
      name: PLACEMENT_DETAILS.tabs.overview.label,
      exact: true,
    });
  }

  /**
   * Expandable Overview card (PF card header title + **Toggle details** + body).
   * Scope by {@link PLACEMENT_DETAILS.sectionCardTitleClass} — section labels like
   * **Used in** also appear inside the Details description list.
   */
  getSectionCard(sectionTitle: keyof typeof PLACEMENT_DETAILS.sections): Locator {
    const label = PLACEMENT_DETAILS.sections[sectionTitle];
    return this.page
      .getByRole('main')
      .locator(`.${PLACEMENT_DETAILS.sectionCardClass}`)
      .filter({
        has: this.page.locator(`.${PLACEMENT_DETAILS.sectionCardTitleClass}`, {
          hasText: new RegExp(`^${label}$`),
        }),
      });
  }

  /** Expandable Overview card toggle (Details, Used in, PlacementDecisions, Conditions). */
  getSectionToggle(sectionTitle: keyof typeof PLACEMENT_DETAILS.sections): Locator {
    return this.getSectionCard(sectionTitle).getByRole('button', {
      name: PLACEMENT_DETAILS.sectionToggleButtonLabel,
    });
  }

  /** PF DescriptionList column(s) inside the **Details** expandable card. */
  getDetailsCardDescriptionList(): Locator {
    return this.getSectionCard('details').locator('.pf-v6-c-description-list');
  }

  getDetailsCardTerm(term: keyof typeof PLACEMENT_DETAILS.descriptionTerms): Locator {
    const label = PLACEMENT_DETAILS.descriptionTerms[term];
    const labelRe = new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`, 'i');
    return this.getDetailsCardDescriptionList().locator('dt').filter({ hasText: labelRe }).first();
  }

  getDetailsCardValue(term: keyof typeof PLACEMENT_DETAILS.descriptionTerms): Locator {
    return this.getDetailsCardTerm(term).locator('xpath=following-sibling::dd[1]').first();
  }

  getClusterSetLink(clusterSetName: string): Locator {
    return this.getDetailsCardValue('clusterSets').getByRole('link', { name: clusterSetName });
  }

  /** **Used in → Applications** table (expand section first). */
  getUsedInApplicationsGrid(): Locator {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', {
        name: PLACEMENT_DETAILS.usedInTable.columns.type,
        exact: true,
      }),
    });
  }

  getUsedInApplicationLink(applicationSetName: string): Locator {
    return this.getUsedInApplicationsGrid().getByRole('link', { name: applicationSetName, exact: true });
  }

  /** **PlacementDecisions** table on Overview. */
  getPlacementDecisionsGrid(): Locator {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', {
        name: PLACEMENT_DETAILS.placementDecisionsTable.columns.clusters,
        exact: true,
      }),
    });
  }

  getPlacementDecisionLink(decisionName: string): Locator {
    return this.getPlacementDecisionsGrid().getByRole('link', { name: decisionName, exact: true });
  }

  getPlacementDecisionClusterLink(clusterName: string): Locator {
    return this.getPlacementDecisionsGrid().getByRole('link', { name: clusterName, exact: true });
  }

  /** **Conditions** table on Overview. */
  getConditionsGrid(): Locator {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', {
        name: PLACEMENT_DETAILS.conditionsTable.columns.reason,
        exact: true,
      }),
    });
  }

  async expandSectionIfCollapsed(sectionTitle: keyof typeof PLACEMENT_DETAILS.sections): Promise<void> {
    const toggle = this.getSectionToggle(sectionTitle);
    await expect(toggle).toBeVisible({ timeout: 120_000 });
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 30_000 });
    }
  }

  async expectOverviewTabSelected(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? 120_000;
    const tab = this.getOverviewTab();
    await expect(tab).toBeVisible({ timeout });
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
