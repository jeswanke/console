import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

/**
 * Cross-Cluster Live Migration (CCLM) wizard dialog.
 *
 * Opened via VM Details → Actions → Migration → Cross cluster migration.
 * Multi-step wizard: Select target → Storage mapping → Review → Migrate.
 */
export class CclmWizardPage extends BasePage {
  private readonly dialog: Locator;

  constructor(page: Page) {
    super(page);
    this.dialog = page.getByRole('dialog');
  }

  async waitForVisible(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 15000 });
  }

  getTitle(): Locator {
    return this.dialog.getByText('Migrate VirtualMachines');
  }

  getTargetClusterText(name: string): Locator {
    return this.dialog.getByText(name);
  }

  /**
   * Locate the Target column in the wizard (both Source and Target share
   * the same CSS class; filter by the h5 "Target" heading).
   */
  private getTargetBox(): Locator {
    return this.dialog
      .locator('.crossclustermigration-target-step__box')
      .filter({ has: this.page.getByRole('heading', { name: 'Target', level: 5 }) });
  }

  async selectTargetCluster(name: string): Promise<void> {
    const clusterToggle = this.getTargetBox().locator('button.pf-v6-c-menu-toggle').first();
    const clusterOption = this.page.locator('#target-cluster-select').locator(`[data-test-id="${name}"]`);

    await expect(async () => {
      await clusterToggle.click();
      await expect(clusterOption).toBeVisible({ timeout: 3000 });
    }).toPass({ intervals: [2000, 3000], timeout: 20000 });
    await clusterOption.click();
  }

  async selectProject(name: string): Promise<void> {
    const projectToggle = this.getTargetBox().locator('button.pf-v6-c-menu-toggle').nth(1);
    const projectOption = this.page.locator('#target-project-select').locator(`[data-test-id="${name}"]`);

    await expect(async () => {
      await projectToggle.click();
      await expect(projectOption).toBeVisible({ timeout: 3000 });
    }).toPass({ intervals: [2000, 3000], timeout: 20000 });
    await projectOption.click();
  }

  getNextButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Next' });
  }

  async clickNext(): Promise<void> {
    await expect(this.getNextButton()).toBeEnabled({ timeout: 10000 });
    await this.getNextButton().click();
  }

  getReadyHeading(): Locator {
    return this.dialog.getByText('Ready to migrate');
  }

  getErrorAlert(): Locator {
    return this.dialog.getByText(/An error occurred/i);
  }

  getMigrateButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Migrate' });
  }

  async clickMigrate(): Promise<void> {
    await expect(this.getReadyHeading()).toBeVisible({ timeout: 60000 });
    await expect(this.getMigrateButton()).toBeEnabled({ timeout: 10000 });
    await this.getMigrateButton().click();
  }

  getSuccessMessage(): Locator {
    return this.dialog.getByText('Migration plan created');
  }

  getSuccessDescription(): Locator {
    return this.dialog.getByText('The migration plan has been created successfully');
  }

  async close(): Promise<void> {
    const closeButton = this.dialog
      .getByRole('button', { name: 'Close' })
      .or(this.dialog.getByRole('button', { name: 'Cancel' }));
    await closeButton.first().click();
  }
}
