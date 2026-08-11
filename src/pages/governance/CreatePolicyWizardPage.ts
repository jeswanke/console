import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { POLICY_CREATE_WIZARD, POLICY_PLACEMENT_PREVIEW } from '@constants/governance';
import type { PoliciesListPage } from '@pages/governance/PoliciesListPage';
import { PlacementTolerationsActions } from '@lib/placement/tolerations-actions';
import { SyncEditorYamlActions } from '@lib/placement/sync-editor-actions';
import {
  getNoClustersMatchWarningInSection,
  type PlacementPreviewWizardHost,
} from '@lib/placement/placement-preview-verify';
import type { PlacementTolerationsWizardHost } from '@lib/placement/tolerations-verify';

/**
 * Governance → **Create policy** wizard (Placement step hosts shared PlacementSection).
 */
export class CreatePolicyWizardPage
  extends BasePage
  implements PlacementTolerationsWizardHost, PlacementPreviewWizardHost
{
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
    return this.page.getByRole('button', {
      name: POLICY_CREATE_WIZARD.nextButtonLabel,
      exact: true,
    });
  }

  getNewPlacementButton(): Locator {
    return this.page.getByRole('button', {
      name: POLICY_CREATE_WIZARD.placement.newPlacementLabel,
    });
  }

  getExistingPlacementButton(): Locator {
    return this.page.getByRole('button', {
      name: POLICY_CREATE_WIZARD.placement.existingPlacementLabel,
    });
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
    // Id contains dots — `#Placement.spec...` is invalid CSS (parsed as classes).
    return this.getWizardContent().locator(
      `[id="${POLICY_PLACEMENT_PREVIEW.placement.numberOfClustersInputId}"]`
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
    if (!(await createBtn.isVisible())) {
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

  async fillDetailsAndAdvanceToPlacementStep(name: string, namespace?: string): Promise<void> {
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

  /** Policy wizard defaults to **No placement**; tolerations require **New placement**. */
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
    await expect(combo).toBeVisible({ timeout: 30_000 });
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
    await checkbox.setChecked(enabled);
    if (enabled) {
      await this.getNumberOfClustersInput().waitFor({ state: 'visible', timeout: 30_000 });
    }
    await this.waitForLoad();
  }

  getReviewPane(): Locator {
    return this.getWizardContent();
  }

  getReviewPlacementSection(): Locator {
    return this.getReviewPane().getByRole('region', { name: 'Placement' });
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
    if (await close.isVisible()) {
      await close.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await modal.waitFor({ state: 'hidden', timeout: 30_000 });
  }

  getNoClustersMatchWarningAlert(): Locator {
    return getNoClustersMatchWarningInSection(this.getReviewPlacementSection());
  }

  getReviewInfoPlacementPreviewAlert(): Locator {
    return this.getReviewPlacementSection()
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

  // ---------------------------------------------------------------------------
  // Step-by-step wizard navigation
  // ---------------------------------------------------------------------------

  async fillName(name: string): Promise<void> {
    await this.getDetailsNameInput().fill(name);
  }

  async advanceToNextStep(): Promise<void> {
    await this.getNextButton().click();
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Templates step
  // ---------------------------------------------------------------------------

  async addPolicyTemplate(templateName: string): Promise<void> {
    await this.page
      .locator('#templates button')
      .filter({ hasText: 'Add policy template' })
      .first()
      .click();
    await this.page
      .locator('.pf-v6-c-menu li')
      .filter({ hasText: templateName })
      .click({ force: true });
    await this.waitForLoad();
  }

  async fillConfigurationPolicyName(value: string): Promise<void> {
    const nameInputs = this.page.getByRole('textbox', { name: 'Name' });
    const input = nameInputs.first();
    await input.scrollIntoViewIfNeeded();
    await input.clear();
    await input.fill(value);
  }

  async fillObjectDefinitionName(value: string): Promise<void> {
    const nameInputs = this.page.getByRole('textbox', { name: 'Name' });
    const objectNameInput = nameInputs.last();
    await objectNameInput.scrollIntoViewIfNeeded();
    await objectNameInput.clear();
    await objectNameInput.fill(value);
  }

  async setIncludeNamespace(value: string): Promise<void> {
    const section = this.page
      .locator('div')
      .filter({ hasText: /Include namespaces/ })
      .filter({ has: this.page.getByRole('textbox') })
      .last();

    const input = section.getByRole('textbox').first();
    await input.waitFor({ state: 'visible', timeout: 30_000 });
    await input.scrollIntoViewIfNeeded();
    await input.clear();
    await input.fill(value);
  }

  async addNamespaceLabelExpression(key: string, value: string): Promise<void> {
    const addExprBtn = this.page.getByRole('button').filter({ hasText: /Add expression/ });
    await addExprBtn.scrollIntoViewIfNeeded();
    await addExprBtn.click();
    await this.waitForLoad();

    const labelInput = this.page.getByRole('textbox', { name: 'Label' });
    await labelInput.waitFor({ state: 'visible', timeout: 10_000 });
    await labelInput.scrollIntoViewIfNeeded();
    await labelInput.clear();
    await labelInput.fill(key);

    const addValBtn = this.page
      .locator('div')
      .filter({ hasText: /^Values/ })
      .filter({ has: this.page.getByRole('button') })
      .last()
      .getByRole('button')
      .filter({ hasText: /Add/ })
      .first();
    await addValBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await addValBtn.click();
    await this.waitForLoad();

    const section = this.page
      .locator('div')
      .filter({ hasText: /^Values/ })
      .filter({ has: this.page.getByRole('textbox') })
      .last();
    const valInput = section.getByRole('textbox').first();
    await valInput.waitFor({ state: 'visible', timeout: 10_000 });
    await valInput.scrollIntoViewIfNeeded();
    await valInput.clear();
    await valInput.fill(value);
  }

  async setRemediation(mode: 'Inform' | 'Enforce'): Promise<void> {
    const radio = this.page.getByRole('radio', { name: mode, exact: true }).first();
    await radio.scrollIntoViewIfNeeded();
    await radio.click();
  }

  // ---------------------------------------------------------------------------
  // Placement step — label predicates
  // ---------------------------------------------------------------------------

  async addClusterBindingLabel(key: string, value: string): Promise<void> {
    const section = this.page.getByRole('region', { name: 'Label expressions' });
    await section.locator('button').filter({ hasText: 'Add label expression' }).click();
    await this.waitForLoad();

    const keyInput = section.locator('input[aria-label="Select the label"]').last();
    await keyInput.click();
    await keyInput.pressSequentially(key, { delay: 30 });
    const keyOption = this.page
      .locator('.pf-v6-c-menu li')
      .filter({ hasText: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
    await keyOption.waitFor({ state: 'visible', timeout: 30_000 });
    await keyOption.click();

    const valInput = section.locator('input[aria-label="Select the values"]').last();
    await valInput.click();
    await valInput.pressSequentially(value, { delay: 30 });
    const valOption = this.page
      .locator('.pf-v6-c-menu li')
      .filter({ hasText: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
    await valOption.waitFor({ state: 'visible', timeout: 30_000 });
    await valOption.click();
  }

  // ---------------------------------------------------------------------------
  // Annotations step
  // ---------------------------------------------------------------------------

  async setAnnotation(sectionName: string, values: string[]): Promise<void> {
    const sectionMap: Record<string, { label: string; placeholder: string }> = {
      '#standards': { label: 'Standards', placeholder: 'Enter the standard' },
      '#categories': { label: 'Categories', placeholder: 'Enter the category' },
      '#controls': { label: 'Controls', placeholder: 'Enter the control' },
    };
    const info = sectionMap[sectionName] ?? { label: sectionName, placeholder: sectionName };
    const section = this.page
      .locator('.pf-v6-c-form__group')
      .filter({ has: this.page.locator('.pf-v6-c-form__group-label', { hasText: info.label }) });
    const textboxes = section.getByPlaceholder(info.placeholder);

    await textboxes.first().click();
    await textboxes.first().clear();
    await textboxes.first().fill(values[0]);

    for (let i = 1; i < values.length; i++) {
      const addBtn = section.getByRole('button', { name: 'Add' }).last();
      await addBtn.click();
      const newInput = textboxes.nth(i);
      await newInput.click();
      await newInput.clear();
      await newInput.fill(values[i]);
    }
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async submitPolicy(): Promise<void> {
    await this.page.getByRole('button', { name: /^Submit$/ }).click();
    await this.waitForLoad(120_000);
  }
}
