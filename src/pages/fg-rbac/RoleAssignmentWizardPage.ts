import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { PF_MODAL } from '@constants/selectors';
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

  getNextButton(): Locator { return this.nextButton; }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
    await this.waitForLoad();
  }

  async clickCancel(): Promise<void> { await this.cancelButton.click(); }
  async submitCreate(): Promise<void> { await this.createButton.click(); }

  getScopeTypeDropdown(): Locator { return this.modal.getByRole('combobox'); }

  async selectScopeType(scopeType: ScopeType): Promise<void> {
    await this.getScopeTypeDropdown().click();
    await this.page.getByRole('option', { name: scopeType }).click();
    await this.waitForLoad();
  }

  async selectScopeClusters(): Promise<void> { await this.selectScopeType(SCOPE_TYPES.clusters); }

  getScopeInfoMessage(): Locator {
    return this.modal.getByText(/This role assignment will apply to/);
  }

  getScopeOption(scopeType: ScopeType): Locator {
    return this.page.getByRole('option', { name: scopeType });
  }

  private async checkTableRows(names: string[]): Promise<void> {
    for (const name of names) {
      await this.modal.getByRole('row', { name }).getByRole('checkbox').check();
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
    for (const name of names) {
      await this.modal.getByRole('row', { name }).getByRole('checkbox').check({ timeout: 60000 });
    }
  }

  getProjectTableRows(): Locator {
    return this.modal.getByRole('row').filter({ has: this.page.getByRole('checkbox') });
  }

  async selectRole(roleName: string): Promise<void> {
    await this.modal.getByRole('radio', { name: `Select role ${roleName}` }).click();
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
