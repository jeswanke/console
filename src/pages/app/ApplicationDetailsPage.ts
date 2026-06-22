import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  APP_APPLICATION_DETAILS,
  APP_APPLICATION_SYNC,
  APP_ARGO_APPLICATION_SYNC,
  APP_APPLICATION_TOPOLOGY,
  APP_ROUTES,
  type AppApplicationDetailsTabKey,
} from '@constants/app';
import { expectTopologyGraphContainsNodeDataIds } from '@lib/app/topology/graph-ids';
import { expectVisibleTopologyDrawerContains } from '@lib/app/topology/drawer';
import { normalizeConsolePathname, pageUrlPathnameEquals } from '@lib/navigation';

/** Subscription app Details / Topology page (`/multicloud/applications/details/{ns}/{name}/{tab}`). */
export class ApplicationDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  isOnApplicationTab(namespace: string, name: string, tab: AppApplicationDetailsTabKey): boolean {
    const slug = APP_APPLICATION_DETAILS.tabs[tab].slug;
    return pageUrlPathnameEquals(this.page, APP_ROUTES.detailsTab(namespace, name, slug));
  }

  /** Any tab under this app’s details route (pathname prefix). */
  isOnApplicationShell(namespace: string, name: string): boolean {
    try {
      const current = normalizeConsolePathname(new URL(this.page.url()).pathname);
      const base = normalizeConsolePathname(APP_ROUTES.details(namespace, name));
      return current === base || current.startsWith(`${base}/`);
    } catch {
      return false;
    }
  }

  /** Open tab via URL, in-shell tab click, or wait if already on tab; then wait for tablist chrome. */
  async navigateToApplicationTab(
    namespace: string,
    name: string,
    tab: AppApplicationDetailsTabKey
  ): Promise<void> {
    if (this.isOnApplicationTab(namespace, name, tab)) {
      await this.waitForLoad();
    } else if (this.isOnApplicationShell(namespace, name)) {
      await this.openDetailTab(tab);
    } else {
      await this.goto(namespace, name, tab);
    }
    await this.waitForApplicationDetailsTabChrome();
  }

  async goto(
    namespace: string,
    name: string,
    tab: AppApplicationDetailsTabKey = 'details'
  ): Promise<void> {
    if (this.isOnApplicationTab(namespace, name, tab)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    const slug = APP_APPLICATION_DETAILS.tabs[tab].slug;
    await this.page.goto(`${consoleUrl}${APP_ROUTES.detailsTab(namespace, name, slug)}`);
    await this.waitForLoad();
  }

  /** Flux CD app topology (`?apiVersion=flux&cluster=…`). Cypress local-cluster Flux suite. */
  async gotoFluxTopology(
    namespace: string,
    name: string,
    clusterName = 'local-cluster'
  ): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    const slug = APP_APPLICATION_DETAILS.tabs.topology.slug;
    const query = `?apiVersion=flux&cluster=${encodeURIComponent(clusterName)}`;
    await this.page.goto(`${consoleUrl}${APP_ROUTES.detailsTab(namespace, name, slug)}${query}`);
    await this.waitForLoad();
  }

  /** Native OpenShift app topology (`?apiVersion=ocp&cluster=…`). Cypress Openshift_Application_Test_Suite. */
  async gotoOpenshiftTopology(
    namespace: string,
    name: string,
    clusterName = 'local-cluster'
  ): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    const slug = APP_APPLICATION_DETAILS.tabs.topology.slug;
    const query = `?apiVersion=ocp&cluster=${encodeURIComponent(clusterName)}`;
    await this.page.goto(`${consoleUrl}${APP_ROUTES.detailsTab(namespace, name, slug)}${query}`);
    await this.waitForLoad();
  }

  /** Application resource name (PF page `h1`). */
  getApplicationHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** Tablist containing Topology / Details (filtered by Topology tab label). */
  getApplicationDetailsTablist(): Locator {
    return this.page.getByRole('tablist').filter({
      has: this.page.getByRole('tab', { name: APP_APPLICATION_DETAILS.tabs.topology.label }),
    });
  }

  /** Secondary tab (Topology, Details, …) within {@link getApplicationDetailsTablist}. */
  getDetailTab(tab: AppApplicationDetailsTabKey): Locator {
    return this.getApplicationDetailsTablist().getByRole('tab', {
      name: APP_APPLICATION_DETAILS.tabs[tab].label,
    });
  }

  /** Waits for secondary nav tablist (URL can match before shell finishes loading). */
  async waitForApplicationDetailsTabChrome(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? 120_000;
    await expect(this.getApplicationDetailsTablist()).toBeVisible({ timeout });
  }

  async openDetailTab(tab: AppApplicationDetailsTabKey): Promise<void> {
    await this.getDetailTab(tab).click();
    await this.waitForLoad();
  }

  async expectDetailTabSelected(
    tab: AppApplicationDetailsTabKey,
    options?: { timeout?: number }
  ): Promise<void> {
    const timeout = options?.timeout ?? 120_000;
    const loc = this.getDetailTab(tab);
    await expect(loc).toBeVisible({ timeout });
    await expect(loc).toHaveAttribute('aria-selected', 'true', { timeout });
  }

  /**
   * PF wrapper labelled **Secondary page navigation tabs** (contains Topology / Details tablist).
   */
  getApplicationDetailsSecondaryNav(): Locator {
    return this.page.getByRole('generic', {
      name: APP_APPLICATION_TOPOLOGY.secondaryNavAccessibleName,
    });
  }

  /** Topology graph toolbar — **Zoom In**. */
  getTopologyZoomInButton(): Locator {
    return this.page.locator(`#${APP_APPLICATION_TOPOLOGY.controlIds.zoomIn}`);
  }

  /** Topology graph toolbar — **Zoom Out**. */
  getTopologyZoomOutButton(): Locator {
    return this.page.locator(`#${APP_APPLICATION_TOPOLOGY.controlIds.zoomOut}`);
  }

  /** Topology graph toolbar — **Fit to Screen**. */
  getTopologyFitToScreenButton(): Locator {
    return this.page.locator(`#${APP_APPLICATION_TOPOLOGY.controlIds.fitToScreen}`);
  }

  /** Topology graph toolbar — **Reset View**. */
  getTopologyResetViewButton(): Locator {
    return this.page.locator(`#${APP_APPLICATION_TOPOLOGY.controlIds.resetView}`);
  }

  /** Opens topology legend / how-to-read guidance (beside the graph). */
  getHowToReadTopologyButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_APPLICATION_TOPOLOGY.howToReadTopologyButtonName,
    });
  }

  /** Prefer {@link getTopologySurface} for graph queries — tabpanel role may be absent. */
  getTopologyTabPanel(): Locator {
    return this.page.getByRole('tabpanel', {
      name: APP_APPLICATION_DETAILS.tabs.topology.label,
      exact: true,
    });
  }

  getTopologySurface(): Locator {
    return this.page.locator(`[data-test-id="${APP_APPLICATION_TOPOLOGY.graphSurfaceTestId}"]`);
  }

  getTopologyGraphNodeByDataId(dataId: string): Locator {
    return this.getTopologySurface().locator(
      `g[data-kind=node][data-type=node][data-id="${dataId}"]`
    );
  }

  async clickTopologyGraphNodeByDataId(dataId: string): Promise<void> {
    // SVG graph groups often sit under overlapping hit targets; `force` matches manual hub interaction.
    // eslint-disable-next-line playwright/no-force-option -- topology `g` nodes are not always the top hit target
    await this.getTopologyGraphNodeByDataId(dataId).click({ force: true });
  }

  /**
   * Poll until all **`data-id`** nodes exist (graph hydration after navigation).
   */
  async expectTopologyGraphContainsNodeDataIds(
    dataIds: string[],
    options?: { timeout?: number }
  ): Promise<void> {
    await expectTopologyGraphContainsNodeDataIds(this.getTopologySurface(), dataIds, options);
  }

  /** Assert a **visible** drawer panel shows text after {@link clickTopologyGraphNodeByDataId}. */
  async expectVisibleTopologyDrawerContains(
    pattern: string | RegExp,
    options?: { timeout?: number }
  ): Promise<void> {
    await expectVisibleTopologyDrawerContains(this.page, pattern, options);
  }

  /** Topology node `button` (scoped to `main` when tabpanel is missing). */
  getTopologyNodeButtonByName(name: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('button', { name });
  }

  /** Multi-subscription scope menu (`#comboChannel`). */
  getTopologyChannelComboNode(): Locator {
    return this.page.locator(`#${APP_APPLICATION_TOPOLOGY.graphElementIds.channelCombo}`);
  }

  getTopologySubscriptionScopeToggle(): Locator {
    return this.getTopologyChannelComboNode();
  }

  async chooseTopologySubscriptionScopeAll(): Promise<void> {
    const toggle = this.getTopologySubscriptionScopeToggle();
    await toggle.click();
    await this.page
      .getByRole('menuitem', {
        name: APP_APPLICATION_TOPOLOGY.subscriptionScopeMenuItemAll,
        exact: true,
      })
      .click();
    await expect(toggle).toHaveAttribute('aria-label', APP_APPLICATION_TOPOLOGY.subscriptionScopeMenuItemAll);
  }

  async chooseTopologySubscriptionScopeByCrName(subscriptionCrName: string): Promise<void> {
    const toggle = this.getTopologySubscriptionScopeToggle();
    await toggle.click();
    await this.page.getByRole('menuitem', { name: subscriptionCrName, exact: true }).click();
    await expect(toggle).toHaveAttribute('aria-label', subscriptionCrName);
  }

  /**
   * Details tab description lists. ApplicationSet (and subscription) Details use a
   * multi-column PF layout with more than one `dl`; scoping to `following::dl[1]` misses
   * right-column terms such as Placement and Cluster resource status.
   */
  getDetailsDescriptionList(): Locator {
    return this.getApplicationHeading().locator('xpath=following::dl');
  }

  /** Description list **term** (`dt` / `role="term"`) on the Details tab. */
  getDescriptionTerm(term: keyof typeof APP_APPLICATION_DETAILS.descriptionTerms): Locator {
    const label = APP_APPLICATION_DETAILS.descriptionTerms[term];
    const list = this.getDetailsDescriptionList();
    const labelRe = new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`, 'i');
    const byRole = list.getByRole('term', { name: label, exact: true });
    const byDt = list.locator('dt').filter({ hasText: labelRe }).first();
    return byRole.or(byDt).first();
  }

  getDescriptionValue(term: keyof typeof APP_APPLICATION_DETAILS.descriptionTerms): Locator {
    const termEl = this.getDescriptionTerm(term);
    return termEl
      .locator('xpath=following-sibling::dd[1] | following-sibling::*[@role="definition"][1]')
      .first();
  }

  /** Breadcrumb back to Applications list. */
  getBreadcrumbApplicationsLink(): Locator {
    return this.page
      .getByRole('navigation', { name: /breadcrumb/i })
      .getByRole('link', { name: APP_APPLICATION_DETAILS.breadcrumb.applications });
  }

  /** Breadcrumb → Applications list (RHACM4K-61329). */
  async returnToApplicationsListViaBreadcrumb(): Promise<void> {
    await this.getBreadcrumbApplicationsLink().click();
    await pageUrlPathnameEquals(this.page, APP_ROUTES.list);
    await expect(
      this.page.getByRole('heading', { name: APP_APPLICATION_DETAILS.breadcrumb.applications, level: 1 })
    ).toBeVisible({ timeout: 10_000 });
  }

  /** Topology graph surface visible (opens Topology tab when landing on another details tab). */
  async expectTopologyGraphVisible(): Promise<void> {
    const surface = this.getTopologySurface();
    if (!(await surface.isVisible().catch(() => false))) {
      await this.openDetailTab('topology');
    }
    await expect(surface).toBeVisible({ timeout: 30_000 });
  }

  /** Assert URL is an application details route (after list row navigation). */
  async expectOnApplicationDetailsRoute(): Promise<void> {
    await expect(this.page).toHaveURL(/\/multicloud\/applications\/details\//, {
      timeout: 30_000,
    });
  }

  /** Details → **Last sync requested** → **Sync** (`a#sync-app`). */
  getSyncApplicationLink(): Locator {
    return this.page.locator(`a#${APP_APPLICATION_DETAILS.syncActionAnchorId}`);
  }

  getSyncApplicationModal(): Locator {
    return this.page.locator(APP_APPLICATION_SYNC.modalSelector);
  }

  /**
   * Poll until **Sync** is visible and not PF aria-disabled (subscription apps only).
   */
  async waitForSyncApplicationLinkEnabled(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? 60_000;
    const link = this.getSyncApplicationLink();
    await expect(link).toBeVisible({ timeout });
    await expect
      .poll(
        async () => {
          const className = (await link.getAttribute('class')) ?? '';
          return !className.includes('pf-m-aria-disabled');
        },
        { timeout, intervals: [500, 1_000, 2_000] }
      )
      .toBe(true);
  }

  /** Clicks Sync on Details and confirms the modal. Caller must already be on Details. */
  async syncApplication(options?: { timeout?: number }): Promise<void> {
    const enableTimeout = options?.timeout ?? 60_000;
    await this.waitForSyncApplicationLinkEnabled({ timeout: enableTimeout });
    const link = this.getSyncApplicationLink();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    const modal = this.getSyncApplicationModal();
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal.getByText(APP_APPLICATION_SYNC.modalTitle, { exact: true })).toBeVisible();
    await modal.getByRole('button', { name: APP_APPLICATION_SYNC.confirmButtonLabel }).click();
    await expect(modal).toBeHidden({ timeout: 120_000 });
    await this.waitForLoad();
  }

  /** Argo CD ApplicationSet child app sync (`a#sync-argo-app`). */
  getSyncArgoCdApplicationLink(): Locator {
    return this.page.locator(`a#${APP_ARGO_APPLICATION_SYNC.syncLinkId}`);
  }

  async waitForSyncArgoCdApplicationLinkEnabled(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? 60_000;
    const link = this.getSyncArgoCdApplicationLink();
    await expect(link).toBeVisible({ timeout });
    await expect
      .poll(
        async () => {
          const className = (await link.getAttribute('class')) ?? '';
          return !className.includes('pf-m-aria-disabled');
        },
        { timeout, intervals: [500, 1_000, 2_000] }
      )
      .toBe(true);
  }

  getSyncArgoCdApplicationModal(): Locator {
    return this.page.locator(APP_ARGO_APPLICATION_SYNC.modalSelector);
  }

  /** RHACM4K-59973: Details → **Sync** → **Synchronize** → success alert. */
  async syncArgoCdApplication(options?: { timeout?: number }): Promise<void> {
    const enableTimeout = options?.timeout ?? 60_000;
    await this.waitForSyncArgoCdApplicationLinkEnabled({ timeout: enableTimeout });
    const link = this.getSyncArgoCdApplicationLink();
    await link.scrollIntoViewIfNeeded();
    await link.click();

    const modal = this.getSyncArgoCdApplicationModal();
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal.locator('[class*="c-modal-box__title-text"]')).toContainText(
      APP_ARGO_APPLICATION_SYNC.modalTitlePattern
    );
    await modal.getByRole('button', { name: APP_ARGO_APPLICATION_SYNC.confirmButtonLabel }).click();

    await expect(
      this.page.locator('[data-ouia-component-type*="Alert"]').filter({
        hasText: APP_ARGO_APPLICATION_SYNC.successAlertText,
      })
    ).toBeVisible({ timeout: 10_000 });
    await this.waitForLoad();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
