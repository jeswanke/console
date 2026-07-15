import { SEARCH_DETAILS_PAGE } from '@constants/search';
import { BasePage } from '@pages/BasePage';
import { expect, Locator, Page } from '@playwright/test';

/**
 * ACM Search Details page (`/multicloud/search/resources`).
 *
 * Reached by clicking a resource-name link in Search results. URL carries
 * the resource identity as query params (cluster, kind, namespace, name).
 *
 * Tabs for a resource: Details | YAML | Related Resources | Logs (Pod specific)
 */
export class SearchDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Wait for the details page tabs and PF loading indicators to settle. */
  async waitForDetailsPageLoad(): Promise<void> {
    await this.getTab(SEARCH_DETAILS_PAGE.tabs.details).waitFor({ state: 'visible' });
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Tab navigation
  // ---------------------------------------------------------------------------

  getTab(name: string): Locator {
    return this.page.getByRole('tab', { name, exact: true });
  }

  async clickTab(name: string): Promise<void> {
    await this.getTab(name).click();
    await expect(this.getTab(name)).toHaveAttribute('aria-selected', 'true');
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Details tab
  // ---------------------------------------------------------------------------

  getDetailsSection(): Locator {
    return this.page.getByRole('heading', {
      name: SEARCH_DETAILS_PAGE.podDetailsSection,
      exact: true,
    });
  }

  getConditionsSection(): Locator {
    return this.page.getByRole('heading', {
      name: SEARCH_DETAILS_PAGE.conditionsSection,
      exact: true,
    });
  }

  // ---------------------------------------------------------------------------
  // YAML tab
  // ---------------------------------------------------------------------------

  /**
   * Returns the YAML editor container. ACM's ResourceYAMLEditor uses Monaco;
   * the outer wrapper carries `data-testid="yaml-editor"` or falls back to
   * the `.view-lines` class added by the Monaco DOM.
   */
  getYamlEditor(): Locator {
    return this.page.locator('[data-testid="yaml-editor"], .view-lines').first();
  }

  /** Returns a locator for a specific text string rendered inside the Monaco editor. */
  getYamlLine(text: string): Locator {
    return this.getYamlEditor().getByText(text);
  }

  // ---------------------------------------------------------------------------
  // Related Resources tab
  // ---------------------------------------------------------------------------

  /**
   * Returns the resource kind accordion toggle inside the Related Resources
   * panel (same component pattern as the Search page's inline related panel).
   */
  getClusterAccordionItem(): Locator {
    return this.page
      .locator('.pf-v6-c-accordion__toggle')
      .filter({ hasText: new RegExp(String.raw`^${SEARCH_DETAILS_PAGE.clusterAccordionLabel}\b`) });
  }

  // ---------------------------------------------------------------------------
  // Logs tab (Pod specific)
  // ---------------------------------------------------------------------------

  /**
   * Returns the PF6 LogViewer wrapper rendered on the Logs tab.
   */
  getLogsViewer(): Locator {
    return this.page.locator('.pf-v6-c-log-viewer').first();
  }
}
