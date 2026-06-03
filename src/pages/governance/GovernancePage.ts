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

  /**
   * Navigate to the discovered policy clusters tab without waitForLoad.
   * Designed for use inside toPass() retry loops where the caller
   * controls when to assert load state.
   */
  async navigateToDiscoveredPolicyClusters(
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
    await this.page.goto(`${consoleUrl}${route}`).catch(() => {});
  }

  async gotoPolicyTemplateDetails(
    namespace: string,
    name: string,
    clusterName: string,
    apiGroup: string,
    apiVersion: string,
    kind: string,
    templateName: string,
  ): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    const route = GOV_ROUTES.policyTemplateDetails(
      namespace,
      name,
      clusterName,
      apiGroup,
      apiVersion,
      kind,
      templateName,
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
   * Resolve a table cell by column header text within a data row.
   * Finds the column index from the header row at call time, then
   * returns the td at that index. Resilient to column reordering.
   */
  private async getCellByColumnHeader(
    row: Locator,
    columnName: string,
  ): Promise<Locator> {
    const headers = this.page
      .getByRole('grid')
      .getByRole('columnheader');
    const count = await headers.count();
    let colIndex = -1;
    for (let i = 0; i < count; i++) {
      const text = await headers.nth(i).textContent();
      if (text?.trim() === columnName) {
        colIndex = i;
        break;
      }
    }
    if (colIndex < 0) {
      throw new Error(
        `Column "${columnName}" not found in table headers`,
      );
    }
    return row.locator('td').nth(colIndex);
  }

  async getClusterLabelsCell(
    clusterName: string,
  ): Promise<Locator> {
    const row = this.getClusterRow(clusterName);
    return this.getCellByColumnHeader(row, 'Labels');
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
    const option = this.page
      .getByRole('menuitem')
      .filter({ hasText: label });
    await option.getByRole('checkbox').click();
  }

  async toggleLabelFilterInequality(label: string): Promise<void> {
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
