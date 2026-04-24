import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  APP_APPLICATION_DETAILS,
  APP_APPLICATION_TOPOLOGY,
  APP_ROUTES,
  type AppApplicationDetailsTabKey,
} from '@constants/app';

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
   * **Topology** tab panel — scope node queries here so `button` matches stay on the graph (not masthead / nav).
   * Uses the same accessible name as the Topology tab label (PF tab ↔ tabpanel wiring on observed hub).
   */
  getTopologyTabPanel(): Locator {
    return this.page.getByRole('tabpanel', {
      name: APP_APPLICATION_DETAILS.tabs.topology.label,
      exact: true,
    });
  }

  /**
   * A topology graph **node** implemented as a `button` (channel / subscription / placement pills often are).
   * Pass the visible name or regex for your app (e.g. subscription or channel display name from the hub).
   */
  getTopologyNodeButtonByName(name: string | RegExp): Locator {
    return this.getTopologyTabPanel().getByRole('button', { name });
  }

  /**
   * Channel combo node when the console assigns **`id="comboChannel"`** (subscription topology on qe6). Prefer
   * {@link getTopologyNodeButtonByName} when ids differ or are absent.
   */
  getTopologyChannelComboNode(): Locator {
    return this.getTopologyTabPanel().locator(`#${APP_APPLICATION_TOPOLOGY.graphElementIds.channelCombo}`);
  }

  /** Description list **term** (`dt` / `role="term"`) on the Details tab. */
  getDescriptionTerm(term: keyof typeof APP_APPLICATION_DETAILS.descriptionTerms): Locator {
    const label = APP_APPLICATION_DETAILS.descriptionTerms[term];
    return this.page.getByRole('term', { name: label, exact: true });
  }

  /**
   * Value cell beside a term (first following sibling — matches PatternFly DescriptionList pairing on qe6 hub).
   */
  getDescriptionValue(term: keyof typeof APP_APPLICATION_DETAILS.descriptionTerms): Locator {
    return this.getDescriptionTerm(term).locator('xpath=following-sibling::*[1]');
  }

  /** Breadcrumb back to Applications list. */
  getBreadcrumbApplicationsLink(): Locator {
    return this.page
      .getByRole('navigation', { name: /breadcrumb/i })
      .getByRole('link', { name: APP_APPLICATION_DETAILS.breadcrumb.applications });
  }
}
