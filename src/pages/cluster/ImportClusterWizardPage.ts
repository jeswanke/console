import { Page, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { PF_SKELETON } from '@constants/selectors';
import { OcCliService } from '@services/OcCliService';
import {
  IMPORT_ROUTES,
  IMPORT_WIZARD_FIELDS,
  IMPORT_MODES,
  IMPORT_BUTTONS,
} from '@constants/cluster-import';

export class ImportClusterWizardPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService,
  ) {
    super(page);
  }

  override async waitForLoad(timeout = 30000): Promise<void> {
    await expect(this.page.locator(PF_SKELETON)).toHaveCount(0, { timeout });
  }

  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${IMPORT_ROUTES.import}`);
    await this.waitForLoad();
  }

  async fillClusterName(name: string): Promise<void> {
    const input = this.page.locator(IMPORT_WIZARD_FIELDS.clusterName);
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    // React re-renders the form after initial load and clears inputs.
    // Retry fill until the value sticks.
    for (let i = 0; i < 5; i++) {
      await input.fill(name);
      await this.page.waitForTimeout(1_000);
      if ((await input.inputValue()) === name) return;
    }
    await input.fill(name);
  }

  async selectImportMode(mode: keyof typeof IMPORT_MODES): Promise<void> {
    const dropdown = this.page.locator(IMPORT_WIZARD_FIELDS.importModeDropdown);
    const combobox = dropdown.getByRole('combobox');
    await combobox.click();
    await this.page.getByRole('option', { name: IMPORT_MODES[mode] }).click();
  }

  async pasteKubeconfig(content: string): Promise<void> {
    const textarea = this.page.locator(IMPORT_WIZARD_FIELDS.kubeConfigEntry);
    await textarea.waitFor({ state: 'visible', timeout: 10_000 });
    await textarea.fill(content);
  }

  async selectClusterSet(name: string): Promise<void> {
    const combobox = this.page.getByRole('combobox', { name: 'Select a cluster set' });
    await combobox.click();
    await combobox.fill(name);
    const option = this.page.getByRole('option', { name }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async fillAdditionalLabels(labels: Record<string, string>): Promise<void> {
    const input = this.page.locator(IMPORT_WIZARD_FIELDS.additionalLabels);
    for (const [key, value] of Object.entries(labels)) {
      await input.fill(`${key}=${value}`);
      await input.press('Enter');
    }
  }

  async clickNext(): Promise<void> {
    await this.page.getByRole('button', { name: IMPORT_BUTTONS.next, exact: true }).click();
    await this.waitForLoad();
  }

  async clickImport(): Promise<void> {
    await this.page
      .getByRole('button', { name: IMPORT_BUTTONS.import, exact: true })
      .click();
  }

  async expectOnOverviewPage(clusterName: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/clusters/details/.*/${clusterName}`),
      { timeout: 30_000 },
    );
  }
}
