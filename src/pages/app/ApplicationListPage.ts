import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { ApplicationsTable } from '@components/app/ApplicationsTable';
import { ManageColumnsDialog } from '@components/patternfly/ManageColumnsDialog';
import { OcCliService } from '@services/OcCliService';
import { PF_SKELETON, SELECTORS } from '@constants/selectors';
import {
  APP_ROUTES,
  APP_PAGE,
  APP_ADVANCED_CONFIG,
  APP_ADVANCED_OC_RESOURCES,
  APP_ADVANCED_TABLE_COLUMNS,
  APP_ADVANCED_TABLE_COLUMNS_CHANNELS,
  APP_APPLICATION_DETAILS,
  APP_FILTER,
} from '@constants/app';
import type { ApplicationExpectationsPayload } from '@config/e2e-spec-loader/domains/application-expectations/applicationExpectationsSchema';
import { defaultSubscriptionCrName } from '@lib/app/topology/graph-ids';
import { acmToolbarSearchLocator } from '@components/patternfly/AcmSearchInput';
import { pageUrlPathnameEquals } from '@lib/navigation';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Applications list (`/multicloud/applications`). Wizard: {@link SubscriptionApplicationCreateWizardPage}. */
export class ApplicationListPage extends BasePage {
  readonly applicationsTable: ApplicationsTable;
  readonly manageColumns: ManageColumnsDialog;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.applicationsTable = new ApplicationsTable(page);
    this.manageColumns = new ManageColumnsDialog(page);
  }

  private async waitForApplicationsListReady(options?: {
    /** Default true (Overview). Set false on Advanced tab. */
    requireOverviewCreateToolbar?: boolean;
  }): Promise<void> {
    const requireToolbar = options?.requireOverviewCreateToolbar !== false;
    await this.getPageTitle().waitFor({ state: 'visible' });
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0);
    if (requireToolbar) {
      await expect(this.applicationsTable.getCreateApplicationButton()).toBeEnabled();
    }
  }

  /** Navigate to the Applications list (skips `goto` when already on the list pathname). */
  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, APP_ROUTES.list)) {
      await this.waitForApplicationsListReady();
      return;
    }
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

  /** Toolbar **Manage columns** control (`aria-label="columns-management"`). */
  getManageColumnsButton(): Locator {
    return this.page.getByLabel('columns-management');
  }

  async verifyManageColumnsButtonVisible(): Promise<void> {
    await expect(this.getManageColumnsButton()).toBeVisible();
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

  /**
   * Applications list **toolbar search** + **Type** filter checks.
   *
   * 1. Toolbar search by `appName` → row with that name is visible.
   * 2. **Filter** → check **Type** `typeFilterLabel` → row still visible.
   * 3. Clear search → row still visible (type filter only), same as clearing the name field after filtering.
   * 4. **Clear all filters** (toolbar link). Does not assert the row afterward — the unfiltered list can paginate
   *    or omit the app from the first page.
   */
  async expectApplicationDiscoverableViaSearchAndTypeFilter(
    appName: string,
    typeFilterLabel: string = APP_FILTER.typeOptions.subscription
  ): Promise<void> {
    await this.goto();
    await this.waitForLoad();
    const table = this.applicationsTable;
    await table.search(appName);
    await expect(table.getRowByName(appName)).toBeVisible();
    await table.selectFilterOption(typeFilterLabel);
    await expect(table.getRowByName(appName)).toBeVisible();
    await table.clearSearch();
    await expect(table.getRowByName(appName)).toBeVisible();
    await table.clickClearAllFilters();
  }

  /**
   * **Advanced configuration → Subscriptions**: row for `subscriptionCrName` has a **Channel** cell whose link text
   * contains `channelDisplaySubstring` (from e2e-spec-data `applicationExpectations.advancedConfiguration`).
   */
  async expectAdvancedConfigSubscriptionTabLinksChannel(params: {
    subscriptionCrName: string;
    channelDisplaySubstring: string;
  }): Promise<void> {
    await this.openAdvancedConfigTab();
    await this.assertAdvancedConfigSubscriptionRowChannelColumn(params);
  }

  /**
   * **Advanced configuration → Channels**: toolbar search, non-empty **Subscriptions** / **Clusters** / **Created**,
   * then **Type** label → popover shows `channelRepositoryUrl` with an enabled **Copy** control.
   */
  async expectAdvancedConfigChannelTabListsSubscription(params: {
    channelDisplaySubstring: string;
    channelRepositoryUrl: string;
    channelRepositoryTypeLabel?: string;
  }): Promise<void> {
    await this.openAdvancedConfigTab();
    await this.assertAdvancedConfigChannelRowTypePopoverAndColumns(params);
  }

  /**
   * Runs subscription + channel Advanced checks in one visit. Requires `advancedConfiguration` in e2e-spec-data
   * (`channelDisplaySubstring`, `channelRepositoryUrl`, optional `channelRepositoryTypeLabel`).
   */
  async expectAdvancedConfigShowsSubscriptionAndChannelForBlock(params: {
    applicationName: string;
    applicationExpectations: ApplicationExpectationsPayload;
    /** 1-based block index (first Git repo block is `1`). */
    blockIndex?: number;
  }): Promise<void> {
    const blockIndex = params.blockIndex ?? 1;
    const { applicationName, applicationExpectations } = params;
    const adv = applicationExpectations.advancedConfiguration;
    const channelDisplaySubstring = adv?.channelDisplaySubstring;
    const channelRepositoryUrl = adv?.channelRepositoryUrl;
    if (!channelDisplaySubstring || !channelRepositoryUrl) {
      throw new Error(
        'expectAdvancedConfigShowsSubscriptionAndChannelForBlock: add ' +
          'specDomains.applicationExpectations.advancedConfiguration.channelDisplaySubstring and ' +
          'channelRepositoryUrl to e2e-spec-data'
      );
    }
    const subscriptionCrName = defaultSubscriptionCrName(applicationName, blockIndex);

    await this.openAdvancedConfigTab();
    await this.assertAdvancedConfigSubscriptionRowChannelColumn({
      subscriptionCrName,
      channelDisplaySubstring,
    });
    await this.assertAdvancedConfigChannelRowTypePopoverAndColumns({
      channelDisplaySubstring,
      channelRepositoryUrl,
      channelRepositoryTypeLabel: adv?.channelRepositoryTypeLabel,
    });
  }

  /** Subscriptions toggle + toolbar search + **Channel** column assertion (caller must already be on Advanced). */
  private async assertAdvancedConfigSubscriptionRowChannelColumn(params: {
    subscriptionCrName: string;
    channelDisplaySubstring: string;
  }): Promise<void> {
    const { subscriptionCrName, channelDisplaySubstring } = params;
    const channelLinkPattern = new RegExp(escapeRegExp(channelDisplaySubstring), 'i');
    await this.getAdvancedResourceToggleButton('subscriptions').click();
    await this.waitForLoad();

    await this.applicationsTable.search(subscriptionCrName);
    await this.waitForLoad();

    const subTable = this.getAdvancedTable();
    const subByLink = subTable.getByRole('row').filter({
      has: subTable.getByRole('link', { name: subscriptionCrName, exact: true }),
    });
    const subRow =
      (await subByLink.count()) > 0
        ? subByLink.first()
        : subTable.locator('tbody tr').filter({ hasText: subscriptionCrName }).first();
    await expect(subRow).toBeVisible({ timeout: 120_000 });
    const channelCell = subRow.locator(`td[data-label="${APP_ADVANCED_TABLE_COLUMNS.channel}"]`);
    const channelLink = channelCell.getByRole('link');
    await expect(channelLink).toBeVisible();
    await expect(channelLink).toHaveText(channelLinkPattern);
    await expect(channelLink).toHaveAttribute('href', /channel|Channel/i);
  }

  /**
   * Channels toggle + toolbar search: **Subscriptions** / **Clusters** / **Created** are non-empty, **Type** matches,
   * popover shows repo URL, **Copy** is enabled (caller must already be on Advanced).
   */
  private async assertAdvancedConfigChannelRowTypePopoverAndColumns(params: {
    channelDisplaySubstring: string;
    channelRepositoryUrl: string;
    channelRepositoryTypeLabel?: string;
  }): Promise<void> {
    const { channelDisplaySubstring, channelRepositoryUrl, channelRepositoryTypeLabel } = params;
    const typeLabel =
      channelRepositoryTypeLabel ?? APP_APPLICATION_DETAILS.repositoryKindLabels.git;
    const channelLinkPattern = new RegExp(escapeRegExp(channelDisplaySubstring), 'i');

    await this.getAdvancedResourceToggleButton('channels').click();
    await this.waitForLoad();
    await this.applicationsTable.clearSearch();
    await this.applicationsTable.search(channelDisplaySubstring);
    await this.waitForLoad();

    const chTable = this.getAdvancedTable();
    const chByLink = chTable.getByRole('row').filter({
      has: chTable.getByRole('link', { name: channelLinkPattern }),
    });
    const chRow =
      (await chByLink.count()) > 0
        ? chByLink.first()
        : chTable.locator('tbody tr').filter({ hasText: channelDisplaySubstring }).first();
    await expect(chRow).toBeVisible({ timeout: 120_000 });

    const subsCell = chRow.locator(`td[data-label="${APP_ADVANCED_TABLE_COLUMNS_CHANNELS.subscriptions}"]`);
    const clustersCell = chRow.locator(`td[data-label="${APP_ADVANCED_TABLE_COLUMNS_CHANNELS.clusters}"]`);
    const createdCell = chRow.locator(`td[data-label="${APP_ADVANCED_TABLE_COLUMNS_CHANNELS.created}"]`);
    await expect(subsCell).toHaveText(/\S/);
    await expect(clustersCell).toHaveText(/\S/);
    await expect(createdCell).toHaveText(/\S/);

    const typeCell = chRow.locator(`td[data-label="${APP_ADVANCED_TABLE_COLUMNS_CHANNELS.type}"]`);
    const typeButton = typeCell.getByRole('button', { name: typeLabel, exact: true });
    await expect(typeButton).toBeVisible();
    await typeButton.click();

    // Channel **Type** popover: anchor by expected URL inside a floating layer (`role=dialog` or `role=tooltip`),
    // not PatternFly `pf-v5` / `pf-v6` class names (those churn with design-system upgrades).
    const popover = this.page
      .locator('[role="dialog"], [role="tooltip"]')
      .filter({ hasText: channelRepositoryUrl })
      .first();
    await expect(popover).toBeVisible({ timeout: 15_000 });
    await expect(popover).toContainText(channelRepositoryUrl);
    const copyButton = popover.getByRole('button', { name: /copy/i }).first();
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toBeEnabled();

    await this.page.keyboard.press('Escape');
  }

  /**
   * After UI **Delete application** with related resources **unchecked**, **Subscriptions** and **Channels**
   * remain on Applications → Advanced configuration (RHACM4K-1558). Placements were removed from that tab;
   * assert Placement CRs via {@link expectOrphanedAlcResourcesAfterApplicationDeleteViaOc} instead.
   */
  async expectAdvancedConfigRelatedResourcesPersistAfterApplicationDelete(params: {
    applicationName: string;
    applicationExpectations: ApplicationExpectationsPayload;
    blockCount: number;
  }): Promise<void> {
    const { applicationName, applicationExpectations, blockCount } = params;

    for (let blockIndex = 1; blockIndex <= blockCount; blockIndex++) {
      await this.expectAdvancedConfigShowsSubscriptionAndChannelForBlock({
        applicationName,
        applicationExpectations,
        blockIndex,
      });
    }
  }

  /**
   * **Overview** list: toolbar search by `applicationName`, row **Actions** → **Edit application**.
   * Lands on subscription edit route (`/multicloud/applications/edit/subscription/...`).
   */
  async openEditSubscriptionApplicationFromOverviewViaSearch(applicationName: string): Promise<void> {
    await this.goto();
    await this.waitForLoad();
    const table = this.applicationsTable;
    await table.search(applicationName);
    await this.waitForLoad();
    const row = table.getRowByName(applicationName);
    await expect(row).toBeVisible({ timeout: 120_000 });
    await table.openRowActions(row);
    await table.clickEditApplicationMenuItem();
    await this.waitForLoad();
  }

  /**
   * **Overview** list: toolbar search by `applicationName`, row **Actions** → **Delete application**,
   * then confirm modal (optionally `#remove-app-resources` before **Delete**). Asserts the row is gone, then runs
   * Optionally {@link OcCliService.deleteNamespace} after UI delete (default `true` for e2e cleanup).
   */
  async deleteApplicationFromOverviewViaSearch(params: {
    applicationName: string;
    /** Hub namespace for the Application CR; deleted via `oc` when {@link deleteNamespaceAfterUiDelete} is true. */
    namespace: string;
    /** Default `true`: enable removing application-related resources in the modal when the control exists. */
    removeRelatedResources?: boolean;
    /** Default `true`: `oc delete namespace` after the Application row disappears (RHACM4K-1558 sets `false`). */
    deleteNamespaceAfterUiDelete?: boolean;
  }): Promise<void> {
    const {
      applicationName,
      namespace,
      removeRelatedResources = true,
      deleteNamespaceAfterUiDelete = true,
    } = params;
    await this.goto();
    await this.waitForLoad();
    const table = this.applicationsTable;
    await table.search(applicationName);
    await this.waitForLoad();
    const row = table.getRowByName(applicationName);
    await expect(row).toBeVisible({ timeout: 120_000 });
    await table.deleteApplicationByRow(row, { removeRelatedResources });
    await this.waitForLoad();
    await expect(table.getRowByName(applicationName)).toHaveCount(0, { timeout: 120_000 });
    if (deleteNamespaceAfterUiDelete) {
      await this.oc.deleteNamespace(namespace);
    }
  }
}
