import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { POLICY_CREATE_WIZARD, POLICY_PLACEMENT_PREVIEW } from '@constants/governance';
import type { PoliciesListPage } from '@pages/governance/PoliciesListPage';
import { PlacementTolerationsActions } from '@lib/placement/tolerations-actions';
import { SyncEditorYamlActions } from '@lib/placement/sync-editor-actions';
import type { PlacementTolerationsWizardHost } from '@lib/placement/tolerations-verify';

/**
 * Governance → **Create policy** wizard (Placement step hosts shared PlacementSection).
 */
export class CreatePolicyWizardPage extends BasePage implements PlacementTolerationsWizardHost {
  readonly tolerations: PlacementTolerationsActions;
  readonly syncEditor: SyncEditorYamlActions;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.tolerations = new PlacementTolerationsActions(page);
    this.syncEditor = new SyncEditorYamlActions(page, '__policyWizardYamlCopy');
  }

  getPageTitle(): Locator {
    return this.page.getByRole('heading', { name: POLICY_CREATE_WIZARD.pageTitle, level: 1 });
  }

  getWizardContent(): Locator {
    return this.page.getByLabel(POLICY_CREATE_WIZARD.contentAriaLabel);
  }

  getWizardStepsNav(): Locator {
    return this.page.getByLabel(POLICY_PLACEMENT_PREVIEW.stepsNavAriaLabel);
  }

  getDetailsNameInput(): Locator {
    return this.getWizardContent().getByRole('textbox', {
      name: POLICY_CREATE_WIZARD.details.nameTextboxLabel,
    });
  }

  getDetailsNamespaceCombobox(): Locator {
    return this.getWizardContent().getByRole('combobox', {
      name: POLICY_CREATE_WIZARD.details.namespaceComboboxLabel,
    });
  }

  getNextButton(): Locator {
    return this.page.getByRole('button', { name: POLICY_CREATE_WIZARD.nextButtonLabel, exact: true });
  }

  getNewPlacementButton(): Locator {
    return this.page.getByRole('button', { name: POLICY_CREATE_WIZARD.placement.newPlacementLabel });
  }

  getExistingPlacementButton(): Locator {
    return this.page.getByRole('button', { name: POLICY_CREATE_WIZARD.placement.existingPlacementLabel });
  }

  getClusterSetsCombobox(): Locator {
    return this.getWizardContent().getByRole('combobox', {
      name: POLICY_PLACEMENT_PREVIEW.placement.clusterSetsComboboxLabel,
    });
  }

  getExistingPlacementCombobox(): Locator {
    return this.getWizardContent().getByRole('combobox', {
      name: POLICY_PLACEMENT_PREVIEW.placement.existingPlacementComboboxLabel,
    });
  }

  getSetLimitCheckbox(): Locator {
    return this.getWizardContent().getByLabel(
      POLICY_PLACEMENT_PREVIEW.placement.setLimitCheckboxLabel
    );
  }

  getNumberOfClustersInput(): Locator {
    return this.getWizardContent().locator(
      `#${POLICY_PLACEMENT_PREVIEW.placement.numberOfClustersInputId}`
    );
  }

  getWizardFooter(): Locator {
    return this.page.locator('.pf-v6-c-wizard__footer');
  }

  getPlacementMatchSummary(): Locator {
    return this.getWizardFooter().filter({
      hasText: POLICY_PLACEMENT_PREVIEW.footer.matchedByPlacementLabel,
    });
  }

  getPlacementPreviewLink(): Locator {
    return this.getPlacementMatchSummary().getByRole('button', {
      name: POLICY_PLACEMENT_PREVIEW.footer.previewLinkPattern,
    });
  }

  getPlacementPreviewModal(): Locator {
    return this.page.locator('.pf-v6-c-modal-box').last();
  }

  async openFromPoliciesList(listPage: PoliciesListPage): Promise<void> {
    await listPage.gotoGovernanceOverview();
    await listPage.openPoliciesTab();
    const createBtn = listPage.getCreatePolicyButton();
    if (!(await createBtn.isVisible().catch(() => false))) {
      await listPage.gotoPoliciesList();
    }
    await createBtn.click();
    await this.waitForLoad();
    await this.getPageTitle().waitFor({ state: 'visible', timeout: 120_000 });
  }

  async selectNamespace(namespace: string): Promise<void> {
    const nsCombo = this.getDetailsNamespaceCombobox();
    await nsCombo.click();
    await this.page.getByRole('option', { name: namespace, exact: true }).click();
    await this.waitForLoad();
  }

  async fillDetailsAndAdvanceToPlacementStep(
    name: string,
    namespace?: string
  ): Promise<void> {
    await this.getDetailsNameInput().fill(name);
    if (namespace) {
      await this.selectNamespace(namespace);
    } else {
      const nsCombo = this.getDetailsNamespaceCombobox();
      await nsCombo.click();
      await this.page.getByRole('option').first().click();
      await this.waitForLoad();
    }
    await this.getNextButton().click();
    await this.waitForLoad();
    await this.getNextButton().click();
    await this.waitForLoad();
    await this.clickWizardStep('placement');
  }

  async clickWizardStep(step: 'placement' | 'review'): Promise<void> {
    const stepId =
      step === 'placement'
        ? POLICY_PLACEMENT_PREVIEW.placementStepNavId
        : POLICY_PLACEMENT_PREVIEW.reviewStepNavId;
    const label = step === 'placement' ? 'Placement' : 'Review';
    await this.getWizardStepsNav().getByRole('button', { name: label, exact: true }).click();
    await expect(this.page.locator(`button#${stepId}`)).toHaveAttribute('aria-current', 'step', {
      timeout: 60_000,
    });
    await this.waitForLoad();
  }

  /** Policy wizard defaults to **Existing placement** until **New placement** is selected. */
  async ensureNewPlacementSelected(): Promise<void> {
    const btn = this.getNewPlacementButton();
    await btn.waitFor({ state: 'visible', timeout: 30_000 });
    if ((await btn.getAttribute('aria-pressed')) !== 'true') {
      await btn.click({ force: true });
      await this.waitForLoad();
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  }

  async ensureExistingPlacementSelected(): Promise<void> {
    const btn = this.getExistingPlacementButton();
    await btn.waitFor({ state: 'visible', timeout: 30_000 });
    if ((await btn.getAttribute('aria-pressed')) !== 'true') {
      await btn.click({ force: true });
      await this.waitForLoad();
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  }

  async selectClusterSet(clusterSetName: string): Promise<void> {
    const combo = this.getClusterSetsCombobox().first();
    await combo.click();
    await this.page.getByRole('option', { name: clusterSetName, exact: true }).click();
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.waitForLoad();
    await this.getPlacementPreviewLink().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async selectExistingPlacement(placementName: string): Promise<void> {
    const combo = this.getExistingPlacementCombobox();
    await combo.click();
    await this.page.getByRole('option', { name: placementName, exact: true }).click();
    await this.waitForLoad();
    await this.getPlacementPreviewLink().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async setPlacementLimitEnabled(enabled: boolean): Promise<void> {
    const checkbox = this.getSetLimitCheckbox();
    const checked = await checkbox.isChecked();
    if (checked !== enabled) {
      await checkbox.click({ force: true });
      await this.waitForLoad();
    }
    if (enabled) {
      await this.getNumberOfClustersInput().waitFor({ state: 'visible', timeout: 30_000 });
    }
  }

  async setPlacementLimitValue(value: number): Promise<void> {
    const input = this.getNumberOfClustersInput().getByRole('spinbutton');
    await input.fill(String(value));
    await this.waitForLoad();
    await this.getPlacementPreviewLink().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async decrementPlacementLimit(): Promise<void> {
    await this.getNumberOfClustersInput().getByRole('button', { name: 'Minus' }).click();
    await this.waitForLoad();
    await this.getPlacementPreviewLink().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async openPlacementPreviewModal(): Promise<void> {
    await this.getPlacementPreviewLink().click();
    await this.getPlacementPreviewModal().waitFor({ state: 'visible', timeout: 30_000 });
  }

  async closePlacementPreviewModal(): Promise<void> {
    const modal = this.getPlacementPreviewModal();
    const close = modal.getByRole('button', { name: /^Close$/i });
    if (await close.isVisible().catch(() => false)) {
      await close.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await modal.waitFor({ state: 'hidden', timeout: 30_000 });
  }

  getNoClustersMatchWarningAlert(): Locator {
    return this.page
      .getByRole('alert')
      .filter({ hasText: POLICY_PLACEMENT_PREVIEW.alerts.noClustersMatchWarning });
  }

  getReviewInfoPlacementPreviewAlert(): Locator {
    return this.page
      .locator('.pf-v6-c-alert.pf-m-info')
      .filter({ hasText: POLICY_PLACEMENT_PREVIEW.alerts.reviewInfoPlacementPreview });
  }

  async advanceToReviewStep(): Promise<void> {
    await this.getNextButton().click();
    await this.waitForLoad();
    await this.getNextButton().click();
    await this.waitForLoad();
    await expect(
      this.getWizardStepsNav().getByRole('button', { name: 'Review', exact: true })
    ).toHaveAttribute('aria-current', 'step', { timeout: 60_000 });
  }
}
