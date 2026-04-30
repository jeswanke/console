import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  APP_APPLICATION_DETAILS,
  APP_APPLICATION_TOPOLOGY,
  APP_ROUTES,
  type AppApplicationDetailsTabKey,
} from '@constants/app';
import {
  expectTopologyGraphContainsNodeDataIds,
  expectVisibleTopologyDrawerContains,
} from '@lib/topology-graph';

/**
 * ACM **single application** console view: Topology / Details (and other tab slugs on the same route family).
 *
 * **Route:** `/multicloud/applications/details/{namespace}/{name}/{tabSlug}` (e.g. `…/details` after Create).
 * Constants in {@link APP_APPLICATION_DETAILS} / {@link APP_APPLICATION_TOPOLOGY} were captured from a live hub
 * (Playwriter) — subscription app Topology + Details, en.
 */
export class ApplicationDetailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  /**
   * Open application details at a given tab (`details` default — post–Create redirect target in observed flow).
   */
  async goto(
    namespace: string,
    name: string,
    tab: AppApplicationDetailsTabKey = 'details'
  ): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    const slug = APP_APPLICATION_DETAILS.tabs[tab].slug;
    await this.page.goto(`${consoleUrl}${APP_ROUTES.detailsTab(namespace, name, slug)}`);
    await this.waitForLoad();
  }

  /** Application resource name (PF page `h1`). */
  getApplicationHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** Secondary tab (Topology, Details, …). */
  getDetailTab(tab: AppApplicationDetailsTabKey): Locator {
    return this.page.getByRole('tab', { name: APP_APPLICATION_DETAILS.tabs[tab].label });
  }

  async openDetailTab(tab: AppApplicationDetailsTabKey): Promise<void> {
    await this.getDetailTab(tab).click();
    await this.waitForLoad();
  }

  async expectDetailTabSelected(tab: AppApplicationDetailsTabKey): Promise<void> {
    await expect(this.getDetailTab(tab)).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * PF wrapper labelled **Secondary page navigation tabs** (contains Topology / Details tablist).
   */
  getApplicationDetailsSecondaryNav(): Locator {
    return this.page.getByRole('generic', {
      name: APP_APPLICATION_TOPOLOGY.secondaryNavAccessibleName,
    });
  }

  /**
   * Tablist that contains **Topology** / **Details** (scoped by tab labels — avoids unrelated page tablists).
   */
  getApplicationDetailsTablist(): Locator {
    return this.page.getByRole('tablist').filter({
      has: this.getDetailTab('topology'),
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

  /**
   * **Topology** tab panel — PF may omit `role="tabpanel"` on some hubs; prefer {@link getTopologySurface} for graph
   * `data-id` / SVG queries.
   */
  getTopologyTabPanel(): Locator {
    return this.page.getByRole('tabpanel', {
      name: APP_APPLICATION_DETAILS.tabs.topology.label,
      exact: true,
    });
  }

  /** PF topology **`data-test-id`** wrapper around the `svg` graph (`g[data-kind=node][data-id=…]`). */
  getTopologySurface(): Locator {
    return this.page.locator(`[data-test-id="${APP_APPLICATION_TOPOLOGY.graphSurfaceTestId}"]`);
  }

  /** Graph **node** group (`g`) with ACM `data-id` (Playwriter — subscription app topology). */
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

  /**
   * A topology graph **node** implemented as a `button` (channel / subscription combo, legend, toolbar).
   * Scoped to **`main`** because `role="tabpanel"` may be absent on some hubs.
   */
  getTopologyNodeButtonByName(name: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('button', { name });
  }

  /**
   * Channel / subscription **combo** (`#comboChannel`) — lives next to the SVG surface, not always inside
   * `role="tabpanel"`.
   */
  getTopologyChannelComboNode(): Locator {
    return this.page.locator(`#${APP_APPLICATION_TOPOLOGY.graphElementIds.channelCombo}`);
  }

  /**
   * PF6 **MenuToggle** for topology **subscription scope** (`All Subscriptions` vs each Subscription CR name).
   * Same element as {@link getTopologyChannelComboNode} (`#comboChannel`).
   */
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

  /** Description list **term** (`dt` / `role="term"`) on the Details tab. */
  getDescriptionTerm(term: keyof typeof APP_APPLICATION_DETAILS.descriptionTerms): Locator {
    const label = APP_APPLICATION_DETAILS.descriptionTerms[term];
    const byRole = this.page.getByRole('term', { name: label, exact: true });
    const byDt = this.page.locator('dt').filter({ hasText: label }).first();
    return byRole.or(byDt).first();
  }

  /**
   * Value cell beside a term (`dd`) — first following sibling in the DescriptionList pair.
   */
  getDescriptionValue(term: keyof typeof APP_APPLICATION_DETAILS.descriptionTerms): Locator {
    const label = APP_APPLICATION_DETAILS.descriptionTerms[term];
    const byDt = this.page.locator('dt').filter({ hasText: label }).first();
    return byDt.locator('xpath=following-sibling::dd[1]');
  }

  /** Breadcrumb back to Applications list. */
  getBreadcrumbApplicationsLink(): Locator {
    return this.page
      .getByRole('navigation', { name: /breadcrumb/i })
      .getByRole('link', { name: APP_APPLICATION_DETAILS.breadcrumb.applications });
  }
}
