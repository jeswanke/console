import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import { PLACEMENT_CREATE_WIZARD, PLACEMENT_ROUTES } from '@constants/placement';
import { PLACEMENT_CREATE_PREVIEW } from '@constants/placement-preview';
import type { PlacementsListPage } from '@pages/cluster/PlacementsListPage';
import { PlacementTolerationsActions } from '@lib/placement/tolerations-actions';
import { SyncEditorYamlActions } from '@lib/placement/sync-editor-actions';
import type { PlacementTolerationsWizardHost } from '@lib/placement/tolerations-verify';
import type { PlacementPreviewWizardHost } from '@lib/placement/placement-preview-verify';

type PlacementWizardStep = keyof typeof PLACEMENT_CREATE_WIZARD.steps;

/**
 * Standalone **Create placement** wizard (Infrastructure → Clusters → Placements).
 */
export class CreatePlacementWizardPage
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
    this.syncEditor = new SyncEditorYamlActions(page, '__placementWizardYamlCopy');
  }

  getPageTitle(): Locator {
    return this.page.getByRole('heading', { name: PLACEMENT_CREATE_WIZARD.pageTitle, level: 1 });
  }

  getWizardNameInput(): Locator {
    return this.page.getByRole('textbox', { name: /^Name$/ }).first();
  }

  getWizardNamespaceCombobox(): Locator {
    return this.page.getByRole('combobox', { name: /Select namespace/i });
  }

  getWizardStepButton(step: PlacementWizardStep): Locator {
    return this.page.getByRole('button', { name: PLACEMENT_CREATE_WIZARD.steps[step] });
  }

  getWizardStepsNav(): Locator {
    return this.page.getByLabel(PLACEMENT_CREATE_PREVIEW.stepsNavAriaLabel);
  }

  getClusterSetsCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: PLACEMENT_CREATE_PREVIEW.placement.clusterSetsComboboxLabel,
    });
  }

  getSetLimitCheckbox(): Locator {
    return this.page.locator(
      `[id$="${PLACEMENT_CREATE_PREVIEW.placement.limitClustersCheckboxIdSuffix}"]`
    );
  }

  getNumberOfClustersInput(): Locator {
    return this.page.locator(
      `[id="${PLACEMENT_CREATE_PREVIEW.placement.numberOfClustersInputId}"]`
    );
  }

  getWizardFooter(): Locator {
    return this.page.locator('.pf-v6-c-wizard__footer');
  }

  getPlacementMatchSummary(): Locator {
    return this.getWizardFooter().filter({
      hasText: PLACEMENT_CREATE_PREVIEW.footer.matchedByPlacementLabel,
    });
  }

  getPlacementPreviewLink(): Locator {
    return this.getPlacementMatchSummary().getByRole('button', {
      name: PLACEMENT_CREATE_PREVIEW.footer.previewLinkPattern,
    });
  }

  getPlacementPreviewModal(): Locator {
    return this.page.locator('.pf-v6-c-modal-box').last();
  }

  getReviewPlacementSection(): Locator {
    const { placementSectionId, expandableSectionClass } = PLACEMENT_CREATE_PREVIEW.review;
    return this.page.locator(
      `#${placementSectionId}.${expandableSectionClass}, #${placementSectionId}`
    );
  }

  getReviewInfoPlacementPreviewAlert(): Locator {
    return this.getReviewPlacementSection()
      .locator('.pf-v6-c-alert.pf-m-info')
      .filter({ hasText: PLACEMENT_CREATE_PREVIEW.alerts.reviewInfoPlacementPreview });
  }

  getNextButton(): Locator {
    return this.page.getByRole('button', { name: /^Next$/i, exact: true });
  }

  async goto(): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${PLACEMENT_ROUTES.createPlacement}`, {
      waitUntil: 'domcontentloaded',
    });
    await this.waitForLoad();
  }

  async openFromPlacementsList(listPage: PlacementsListPage): Promise<void> {
    await listPage.goto();
    await listPage.openPlacementsTab();
    await listPage.clickCreatePlacement();
    await this.waitForLoad();
    await this.getPageTitle().waitFor({ state: 'visible', timeout: 120_000 });
  }

  async clickWizardStep(step: PlacementWizardStep | 'review'): Promise<void> {
    const stepPattern =
      step === 'review'
        ? PLACEMENT_CREATE_PREVIEW.steps.review
        : PLACEMENT_CREATE_WIZARD.steps[step as PlacementWizardStep];
    await this.getWizardStepsNav()
      .getByRole('button', { name: stepPattern })
      .click();
    await this.waitForLoad();
    if (step === 'placement') {
      await this.tolerations.getTolerationsSectionHeading().waitFor({ state: 'visible', timeout: 60_000 });
    }
  }

  async fillGeneralFields(name: string, namespace: string): Promise<void> {
    await this.clickWizardStep('general');
    await this.getWizardNameInput().fill(name);
    const nsCombo = this.getWizardNamespaceCombobox();
    await nsCombo.click();
    const option = this.page.getByRole('option', { name: namespace, exact: true });
    if (await option.count()) {
      await option.click();
    } else {
      await nsCombo.fill(namespace);
      await nsCombo.press('Enter');
    }
    await this.waitForLoad();
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

  async setPlacementLimitEnabled(enabled: boolean): Promise<void> {
    const checkbox = this.getSetLimitCheckbox();
    await checkbox.setChecked(enabled);
    if (enabled) {
      await this.getNumberOfClustersInput().waitFor({ state: 'visible', timeout: 30_000 });
    }
    await this.waitForLoad();
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

  async advanceToReviewStep(): Promise<void> {
    await this.getNextButton().click();
    await this.waitForLoad();
    await expect(
      this.getWizardStepsNav().getByRole('button', { name: PLACEMENT_CREATE_PREVIEW.steps.review })
    ).toHaveAttribute('aria-current', 'step', { timeout: 60_000 });
  }

  async expandReviewPlacementSection(): Promise<void> {
    const { placementSectionId, expandableSectionClass } = PLACEMENT_CREATE_PREVIEW.review;
    const toggle = this.page
      .locator(`#${placementSectionId}.${expandableSectionClass} button.pf-m-link`)
      .first();
    if ((await toggle.getAttribute('aria-expanded').catch(() => null)) !== 'true') {
      await toggle.click();
      await this.waitForLoad();
    }
  }

  /** @inheritdoc PlacementTolerationsWizardHost — delegates to shared tolerations actions */
  getTolerationSummaryChip(key: string): Locator {
    return this.tolerations.getTolerationSummaryChip(key);
  }

  getTolerationFieldGroupByKey(keySubstring: string): Locator {
    return this.tolerations.getTolerationFieldGroupByKey(keySubstring);
  }

  getLastTolerationFieldGroup(): Locator {
    return this.tolerations.getLastTolerationFieldGroup();
  }

  async scrollToTolerationsSection(): Promise<void> {
    return this.tolerations.scrollToTolerationsSection();
  }

  async expandTolerationFieldGroup(group: Locator): Promise<void> {
    return this.tolerations.expandTolerationFieldGroup(group);
  }

  async selectTolerationOperator(
    group: Locator,
    operator: keyof typeof PLACEMENT_CREATE_WIZARD.tolerations.operators
  ): Promise<void> {
    return this.tolerations.selectTolerationOperator(group, operator);
  }

  async fillTolerationValue(group: Locator, value: string): Promise<void> {
    return this.tolerations.fillTolerationValue(group, value);
  }

  async selectTolerationEffect(
    group: Locator,
    effect: keyof typeof PLACEMENT_CREATE_WIZARD.tolerations.effects
  ): Promise<void> {
    return this.tolerations.selectTolerationEffect(group, effect);
  }

  getTolerationSecondsInput(group: Locator): Locator {
    return this.tolerations.getTolerationSecondsInput(group);
  }

  async fillTolerationSeconds(group: Locator, seconds: string): Promise<void> {
    return this.tolerations.fillTolerationSeconds(group, seconds);
  }

  async removeTolerationFieldGroup(group: Locator): Promise<void> {
    return this.tolerations.removeTolerationFieldGroup(group);
  }

  async clickAddToleration(): Promise<void> {
    return this.tolerations.clickAddToleration();
  }

  async enableYamlEditor(): Promise<void> {
    return this.syncEditor.enableYamlEditor();
  }

  async copySyncEditorYaml(): Promise<string> {
    return this.syncEditor.copyYaml();
  }

  async waitForSyncEditorYamlMatching(pattern: RegExp, timeoutMs = 60_000): Promise<string> {
    return this.syncEditor.waitForYamlMatching(pattern, timeoutMs);
  }

  async readSyncEditorYaml(options?: { waitPattern?: RegExp; timeoutMs?: number }): Promise<string> {
    return this.syncEditor.readYaml(options);
  }
}
