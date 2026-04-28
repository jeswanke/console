import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  GOV_ROUTES,
  GOV_DISCOVERED_DETAILS,
  GOV_LABELS,
} from '@constants/governance';

/**
 * Governance page — navigates tabs, discovered policies list, Clusters tab,
 * and label filter interactions.
 */
export class GovernancePage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService,
  ) {
    super(page);
  }

  async gotoDiscoveredPolicies(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(
      `${consoleUrl}${GOV_ROUTES.discoveredPolicies}`,
    );
    await this.waitForLoad();
  }

  async gotoDiscoveredPolicyClusters(
    apiGroup: string,
    apiVersion: string,
    kind: string,
    policyName: string,
  ): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    const route = GOV_ROUTES.discoveredByCluster(
      apiGroup,
      apiVersion,
      kind,
      policyName,
    );
    await this.page.goto(`${consoleUrl}${route}`);
    await this.waitForLoad();
  }

  // ----- Tab / secondary nav -----

  async clickClustersTab(): Promise<void> {
    await this.page
      .getByRole('tab', {
        name: GOV_DISCOVERED_DETAILS.tabs.clusters,
        exact: true,
      })
      .click();
    await this.waitForLoad();
  }

  // ----- Table interactions -----

  getPolicyLink(policyName: string): Locator {
    return this.page.getByRole('link', {
      name: policyName,
      exact: true,
    });
  }

  getClusterRow(clusterName: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('link', {
        name: clusterName,
        exact: true,
      }),
    });
  }

  /**
   * Labels is the 2nd column (index 1) in the Clusters tab table.
   * Column order: Cluster | Labels | Response action | Severity | Violations | Source
   */
  getClusterLabelsCell(clusterName: string): Locator {
    return this.getClusterRow(clusterName).locator('td').nth(1);
  }

  getClusterLink(clusterName: string): Locator {
    return this.page.getByRole('link', {
      name: clusterName,
      exact: true,
    });
  }

  // ----- Labels popover -----

  getLabelsPopover(): Locator {
    return this.page.locator(
      '[aria-describedby*="popover-labels"]',
    );
  }

  // ----- Label filter -----

  getLabelFilterButton(): Locator {
    return this.page.getByRole('button', {
      name: GOV_LABELS.filterButtonName,
      exact: true,
    });
  }

  async openLabelFilter(): Promise<void> {
    await this.getLabelFilterButton().click();
  }

  async selectLabelFilterValue(label: string): Promise<void> {
    // PF filter renders options as menuitems with checkboxes.
    // Click the checkbox, NOT the text (to avoid toggling =/!= mode).
    const option = this.page
      .getByRole('menuitem')
      .filter({ hasText: label });
    await option.getByRole('checkbox').click();
  }

  async toggleLabelFilterInequality(label: string): Promise<void> {
    // PF inequality toggle is a button showing "=" inside each menuitem.
    // Clicking it switches the filter mode to "!=" (inequality).
    const option = this.page
      .getByRole('menuitem')
      .filter({ hasText: label });
    await option.getByRole('button', { name: '=' }).click();
  }

  async clearAllFilters(): Promise<void> {
    const clearButton = this.page.getByRole('button', {
      name: /clear all filters/i,
    });
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      await this.waitForLoad();
    }
  }
}
