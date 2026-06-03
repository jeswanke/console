import { Page, Locator, expect } from '@playwright/test';

/**
 * Fleet Virtualization Advanced Search panel.
 *
 * The advanced search is a side panel (NOT a dialog element).
 * Clicking Search navigates to a search results page (/search?rowFilter-...).
 *
 * Combobox fields use PF6 MultiSelectTypeahead:
 * - Before selection: placeholder "All clusters" / "All projects"
 * - After selection: placeholder changes to "Select cluster" / "Select project"
 * - Both states use combobox role with name "Type to filter"
 */
export class AdvancedSearchModal {
  constructor(private readonly page: Page) {}

  private getClusterCombobox(): Locator {
    return this.page.locator(
      'input[placeholder="All clusters"], input[placeholder="Select cluster"]'
    );
  }

  private getProjectCombobox(): Locator {
    return this.page.locator(
      'input[placeholder="All projects"], input[placeholder="Select project"]'
    );
  }

  getHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Advanced search', level: 1 });
  }

  async selectCluster(clusterName: string): Promise<void> {
    await expect(async () => {
      const combobox = this.getClusterCombobox();
      await combobox.scrollIntoViewIfNeeded();
      await combobox.click();
      const option = this.page.getByRole('option', { name: clusterName });
      await expect(option).toBeVisible({ timeout: 5000 });
      await option.click();
    }).toPass({ intervals: [2000, 3000, 5000, 8000], timeout: 60000 });
  }

  async selectProject(projectName: string): Promise<void> {
    await expect(async () => {
      const combobox = this.getProjectCombobox();
      await combobox.scrollIntoViewIfNeeded();

      // Use the toggle button adjacent to the combobox for reliable dropdown open
      const toggle = combobox.locator('xpath=following::button[@aria-label="Multi select Typeahead menu toggle"][1]');
      await toggle.click();

      const option = this.page.getByRole('option', { name: projectName, exact: true });
      await expect(option).toBeVisible({ timeout: 5000 });
      await option.click();
    }).toPass({ intervals: [2000, 3000, 5000], timeout: 30000 });
  }

  async clickSearch(): Promise<void> {
    const searchButton = this.page.getByRole('button', { name: 'Search', exact: true });
    await expect(searchButton).toBeEnabled({ timeout: 5000 });
    await searchButton.click();
    await this.page.waitForURL('**/search**', { timeout: 15000 });
  }

  async searchByClusterAndProject(clusterName: string, projectName: string): Promise<void> {
    await this.selectCluster(clusterName);
    await this.selectProject(projectName);
    await this.clickSearch();
  }
}
