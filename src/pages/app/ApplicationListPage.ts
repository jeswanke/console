import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { ApplicationsTable } from '@components/app/ApplicationsTable';
import { OcCliService } from '@services/OcCliService';
import { PF_SKELETON, SELECTORS } from '@constants/selectors';
import {
  APP_ROUTES,
  APP_PAGE,
  APP_ADVANCED_CONFIG,
  APP_ADVANCED_OC_RESOURCES,
} from '@constants/app';
import { acmToolbarSearchLocator } from '@utils/acm-locators';

/**
 * Applications list page (Application Lifecycle).
 *
 * Route: /multicloud/applications
 * Contains: page title, Overview / Advanced configuration tabs, toolbar, applications table.
 *
 * For **Create application → Subscription** wizard locators, see **`SubscriptionApplicationCreateWizardPage`**
 * (`src/pages/app/SubscriptionApplicationCreateWizardPage.ts`).
 *
 * For **single application** Topology / Details, see **`ApplicationDetailsPage`**
 * (`src/pages/app/ApplicationDetailsPage.ts`).
 */
export class ApplicationListPage extends BasePage {
  readonly applicationsTable: ApplicationsTable;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.applicationsTable = new ApplicationsTable(page);
  }

  /**
   * List view can keep transient spinners (table refresh, health) while the page is usable.
   * Wait for stable, user-facing readiness instead of global `.pf-v6-c-spinner` count 0.
   *
   * **Advanced configuration** does not mount the Overview toolbar — `#application-create` is absent; readiness is
   * heading + skeleton only (empty state uses a **Create application** link, not the toolbar control).
   */
  private async waitForApplicationsListReady(options?: {
    /** When `false`, do not wait for `#application-create` (Advanced tab). Default `true` (Overview). */
    requireOverviewCreateToolbar?: boolean;
  }): Promise<void> {
    const requireToolbar = options?.requireOverviewCreateToolbar !== false;
    await this.getPageTitle().waitFor({ state: 'visible' });
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0);
    if (requireToolbar) {
      await expect(this.applicationsTable.getCreateApplicationButton()).toBeEnabled();
    }
  }

  /** Navigate to the Applications list */
  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${APP_ROUTES.list}`);
    await this.waitForApplicationsListReady();
  }

  /** Open the Overview tab */
  async openOverviewTab(): Promise<void> {
    await this.page.getByRole('tab', { name: APP_PAGE.tabs.overview }).click();
    await this.waitForApplicationsListReady();
  }

  /** Open the Advanced configuration tab */
  async openAdvancedConfigTab(): Promise<void> {
    await this.page.getByRole('tab', { name: APP_PAGE.tabs.advancedConfig }).click();
    await this.waitForApplicationsListReady({ requireOverviewCreateToolbar: false });
    await expect(this.getAdvancedConfigTab()).toHaveAttribute('aria-selected', 'true');
  }

  /** Locator for Overview tab content (applications table; no tabpanel in DOM) */
  getOverviewContent(): Locator {
    return this.page.locator(SELECTORS.application.table);
  }

  /** Locator for the Advanced configuration tab (use selected state; no tabpanel in DOM) */
  getAdvancedConfigTab(): Locator {
    return this.page.getByRole('tab', { name: APP_PAGE.tabs.advancedConfig });
  }

  /** Locator for Advanced configuration tab content: terminology card (unique to Advanced tab) */
  getAdvancedConfigContent(): Locator {
    return this.page.locator(SELECTORS.application.terminologyCard);
  }

  /** Deprecation alert (Placements → Infrastructure); scoped by banner copy. */
  getAdvancedDeprecationAlert(): Locator {
    return this.page
      .locator('[class*="c-alert"]')
      .filter({ hasText: APP_ADVANCED_CONFIG.deprecationBanner.bodyPattern })
      .first();
  }

  /** "Learn more" inside {@link getAdvancedDeprecationAlert}. */
  getAdvancedDeprecationLearnMoreLink(): Locator {
    return this.getAdvancedDeprecationAlert().getByRole('link', {
      name: APP_ADVANCED_CONFIG.deprecationBanner.learnMoreLinkName,
    });
  }

  /** Terminology card title (e.g. "Learn more about the terminology") */
  getAdvancedTerminologyCardTitle(): Locator {
    return this.getAdvancedConfigContent().getByText(
      APP_ADVANCED_CONFIG.terminologyCard.title,
      { exact: true }
    );
  }

  /** "View documentation" link inside the terminology card */
  getAdvancedViewDocumentationLink(): Locator {
    return this.getAdvancedConfigContent().getByRole('link', {
      name: APP_ADVANCED_CONFIG.terminologyCard.viewDocsLinkText,
    });
  }

  /** Resource type toggle button (Subscriptions, Channels) */
  getAdvancedResourceToggleButton(
    key: keyof typeof SELECTORS.application.resourceToggle
  ): Locator {
    return this.page.locator(SELECTORS.application.resourceToggle[key]);
  }

  /** Table on Advanced tab (same as Overview; columns differ by resource type) */
  getAdvancedTable(): Locator {
    return this.page.locator(SELECTORS.application.table);
  }

  /** Whether the cluster has any resources for the given Advanced config view (uses oc get -A). */
  async advancedConfigViewHasResources(
    view: keyof typeof APP_ADVANCED_OC_RESOURCES
  ): Promise<boolean> {
    return this.oc.hasResourcesInCluster(APP_ADVANCED_OC_RESOURCES[view]);
  }

  /** Empty state on Advanced tab (when table has no rows). Heading text varies (e.g. "...yet"). */
  getAdvancedEmptyState(
    view: keyof typeof APP_ADVANCED_CONFIG.emptyState.titlePatterns
  ): Locator {
    const pattern = APP_ADVANCED_CONFIG.emptyState.titlePatterns[view];
    // PF nests empty-state__content/__header/__title under the root; all match [class*="empty-state"].
    return this.page
      .locator('[class*="empty-state"]')
      .filter({ has: this.page.getByRole('heading', { name: pattern, level: 4 }) })
      .first();
  }

  /** Search input (toolbar; visible on both Overview and Advanced configuration tabs) */
  getSearchInput(): Locator {
    return acmToolbarSearchLocator(this.page);
  }

  /** Get the page heading (Applications) */
  getPageTitle(): Locator {
    return this.page.getByRole('heading', { name: APP_PAGE.title, level: 1 });
  }

  /** Click Create application (opens dropdown/modal) */
  async openCreateApplication(): Promise<void> {
    await this.applicationsTable.clickCreateApplication();
    await expect(this.applicationsTable.getCreateApplicationMenu()).toBeVisible();
  }
}
