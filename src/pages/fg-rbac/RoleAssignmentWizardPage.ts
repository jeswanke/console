import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { PF_MODAL, PF_SPINNER, PF_SKELETON } from '@constants/selectors';
import {
  SCOPE_TYPES,
  RBAC_WIZARD,
  ScopeType,
  GranularityOption,
} from '@constants/fg-rbac';

/**
 * Role Assignment Wizard Modal.
 *
 * Methods are added incrementally as tests need them.
 * Only methods called by current specs exist here.
 */
export class RoleAssignmentWizardPage extends BasePage {
  private readonly modal: Locator;
  private readonly nextButton: Locator;
  private readonly cancelButton: Locator;
  private readonly createButton: Locator;

  constructor(page: Page) {
    super(page);
    this.modal = page.locator(PF_MODAL);
    this.nextButton = this.modal.getByRole('button', { name: 'Next', exact: true });
    this.cancelButton = this.modal.getByRole('button', { name: 'Cancel' });
    this.createButton = this.modal.getByRole('button', { name: 'Create' });
  }

  override async waitForLoad(timeout = 30000): Promise<void> {
    await expect(this.modal.locator(PF_SPINNER)).toHaveCount(0, { timeout });
    await expect(this.modal.locator(PF_SKELETON)).toHaveCount(0, { timeout });
  }

  getNextButton(): Locator { return this.nextButton; }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
    await this.waitForLoad();
  }

  async clickCancel(): Promise<void> { await this.cancelButton.last().click(); }
  async submitCreate(): Promise<void> { await this.createButton.click(); }

  getScopeTypeDropdown(): Locator { return this.modal.getByRole('combobox'); }

  async selectScopeType(scopeType: ScopeType): Promise<void> {
    await this.getScopeTypeDropdown().click();
    await this.page.getByRole('option', { name: scopeType }).click();
    await this.waitForLoad(60000);
  }

  async selectScopeClusters(): Promise<void> { await this.selectScopeType(SCOPE_TYPES.clusters); }

  getScopeInfoMessage(): Locator {
    return this.modal.getByText(/This role assignment will apply to/);
  }

  getScopeOption(scopeType: ScopeType): Locator {
    return this.page.getByRole('option', { name: scopeType });
  }

  /**
   * Finds and checks rows by name in a paginated wizard table.
   * Uses search input when available; falls back to pagination otherwise.
   */
  private async checkTableRows(names: string[]): Promise<void> {
    const dialog = this.page.getByRole('dialog').last();
    await dialog
      .getByRole('row')
      .filter({ has: this.page.getByRole('checkbox') })
      .first()
      .waitFor({ state: 'visible', timeout: 60000 });

    const searchInput = dialog.getByPlaceholder('Search');
    const hasSearch = await searchInput.isVisible();

    for (const name of names) {
      if (hasSearch) {
        await searchInput.clear();
        await searchInput.fill(name);
        await this.waitForLoad();
      }

      let row = dialog.getByRole('row', { name });

      // Paginate if the row isn't visible (e.g. "default" cluster set on page 2+)
      if ((await row.count()) === 0) {
        const nextBtn = dialog.getByRole('button', { name: 'Go to next page' });
        while (await nextBtn.isEnabled().catch(() => false)) {
          await nextBtn.click();
          await this.waitForLoad();
          row = dialog.getByRole('row', { name });
          if ((await row.count()) > 0) break;
        }
      }

      await row.first().waitFor({ state: 'visible', timeout: 15000 });
      await row.first().getByRole('checkbox').check({ timeout: 30000 });

      if (hasSearch) {
        await searchInput.clear();
        await this.waitForLoad();
      }
    }
  }

  async selectClusterSets(names: string[]): Promise<void> {
    await this.checkTableRows(names);
  }

  async selectClusters(names: string[]): Promise<void> {
    await this.checkTableRows(names);
  }

  async selectGranularity(option: GranularityOption): Promise<void> {
    await this.modal.getByRole('combobox').click();
    await this.page.getByRole('option', { name: option }).click();
    await this.waitForLoad();
  }

  async searchProjects(query: string): Promise<void> {
    const search = this.modal.getByPlaceholder(RBAC_WIZARD.projects.searchPlaceholder);
    await search.clear();
    await search.fill(query);
    await this.waitForLoad();
  }

  async selectProjects(names: string[]): Promise<void> {
    await this.waitForLoad();
    await this.getProjectTableRows().first().waitFor({ state: 'visible', timeout: 90000 });
    for (const name of names) {
      await this.modal.getByRole('row', { name }).getByRole('checkbox').check({ timeout: 60000 });
    }
  }

  getProjectTableRows(): Locator {
    return this.modal.getByRole('row').filter({ has: this.page.getByRole('checkbox') });
  }

  getCreateCommonProjectButton(): Locator {
    return this.modal.locator(`#${RBAC_WIZARD.projects.createButtonId}`);
  }

  getProjectNameInput(): Locator {
    return this.modal.getByPlaceholder(RBAC_WIZARD.projects.enterProjectName);
  }

  async selectRole(roleName: string): Promise<void> {
    const radio = this.modal.getByRole('radio', { name: `Select role ${roleName}` });
    await radio.check();
    await this.waitForLoad();
  }

  async searchRole(roleName: string): Promise<void> {
    const searchInput = this.modal.locator('[aria-label="Search input"]');
    await searchInput.clear();
    await searchInput.fill(roleName);
  }

  getReviewSubject(): Locator {
    return this.modal.getByRole('heading', { name: 'User', level: 3 }).locator('..');
  }

  getReviewScope(): Locator {
    return this.modal.getByRole('heading', { name: 'Scope', level: 3 }).locator('..');
  }

  getReviewRole(): Locator {
    return this.modal.getByRole('heading', { name: 'Role', level: 3 }).locator('..');
  }

  async openViewExamples(): Promise<void> {
    await this.modal.getByText(RBAC_WIZARD.viewExamples.link).click();
  }

  async closeViewExamples(): Promise<void> {
    await this.modal.getByRole('button', { name: 'Close drawer panel' }).click();
  }

  getExamplesDrawer(): Locator {
    return this.modal.getByText(RBAC_WIZARD.viewExamples.drawerTitle);
  }

  getSuccessNotification(): Locator { return this.page.getByText(RBAC_WIZARD.notifications.added); }
  getUpdatedNotification(): Locator { return this.page.getByText(RBAC_WIZARD.notifications.updated); }
  getDuplicateError(): Locator { return this.page.getByText(RBAC_WIZARD.notifications.duplicate); }

  async selectIdentity(username: string): Promise<void> {
    const searchInput = this.modal.getByRole('textbox', { name: 'Search input' });
    await searchInput.clear();
    await searchInput.fill(username);
    await this.modal.getByRole('radio', { name: `Select ${username}` }).click({ timeout: 30000 });
  }

  getWizardTitle(): Locator { return this.modal.getByRole('heading').first(); }

  getModal(): Locator { return this.modal; }

  // ---------------------------------------------------------------------------
  // Pre-authorized user support
  // ---------------------------------------------------------------------------

  getPreAuthButton(): Locator {
    return this.modal.locator('#create-pre-authorized-user');
  }

  getPreAuthIdentifierInput(): Locator {
    return this.modal.getByPlaceholder(RBAC_WIZARD.preAuthorizedUser.identifierPlaceholder);
  }

  getSavePreAuthButton(): Locator {
    return this.modal.getByRole('button', { name: /save.*user|add.*user/i });
  }

  getCancelPreAuthLink(): Locator {
    return this.modal.getByText(/cancel.*search.*instead/i);
  }

  getPreAuthCreatedNotification(): Locator {
    return this.page.getByText(RBAC_WIZARD.preAuthorizedUser.createdNotification);
  }

  // ---------------------------------------------------------------------------
  // Edit mode support
  // ---------------------------------------------------------------------------

  getNoChangesAlert(): Locator {
    return this.modal.locator(RBAC_WIZARD.editMode.dangerAlertSelector);
  }

  getDiffStrikethrough(): Locator {
    return this.modal.locator('s');
  }

  getUpdateButton(): Locator {
    return this.modal.getByRole('button', { name: 'Save', exact: true });
  }

  async submitUpdate(): Promise<void> {
    await this.getUpdateButton().click();
  }
}
