import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  APP_APPLICATION_DETAILS,
  APP_ARGO_PUSH_CREATE_WIZARD,
  APP_CREATE_MENU,
  APP_ROUTES,
  type AppArgoPushCreateWizardStepId,
} from '@constants/app';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushPlacementLabelExpression, ArgoPushGitRepositorySpec, ArgoPushHelmRepositorySpec } from '@lib/app/argo-push/types';
import {
  fillArgoAppsetWizardBeforePlacement,
  type FillArgoAppsetBeforePlacementOptions,
} from '@lib/app/argo/fill-wizard-before-placement';
import { ArgoPlacementPreviewActions } from '@lib/app/argo/placement-preview-actions';
import { PlacementTolerationsActions } from '@lib/placement/tolerations-actions';
import { SyncEditorYamlActions } from '@lib/placement/sync-editor-actions';
import type { PlacementTolerationsWizardHost } from '@lib/placement/tolerations-verify';
import { normalizeConsolePathname } from '@utils/console-navigation';

/** Accessible-name prefix for review detail rows (`button "Name … Edit"`). */
function reviewFieldAccessibleNamePattern(fieldLabel: string | RegExp): RegExp {
  if (typeof fieldLabel === 'string') {
    const escaped = fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}\\b`, 'i');
  }
  const { source, flags } = fieldLabel;
  if (source.startsWith('^') && source.endsWith('$') && !source.includes('|')) {
    return new RegExp(`^${source.slice(1, -1)}\\b`, flags);
  }
  return fieldLabel;
}

/**
 * Argo CD ApplicationSet **push model** create wizard.
 *
 * **Route:** {@link APP_ROUTES.createArgoPush}
 * **Entry:** Applications list → {@link APP_CREATE_MENU.optionIds.argoPushModel}.
 * Pull model: {@link ArgoPullApplicationCreateWizardPage} + {@link APP_ARGO_PULL_CREATE_WIZARD}.
 */
export class ArgoPushApplicationCreateWizardPage extends BasePage implements PlacementTolerationsWizardHost {
  readonly tolerations: PlacementTolerationsActions;
  readonly syncEditor: SyncEditorYamlActions;
  readonly placementPreview: ArgoPlacementPreviewActions;

  constructor(
    page: Page,
    public readonly oc: OcCliService,
    wizardYamlCopyId = '__argoPushWizardYamlCopy'
  ) {
    super(page);
    this.tolerations = new PlacementTolerationsActions(page);
    this.syncEditor = new SyncEditorYamlActions(page, wizardYamlCopyId);
    this.placementPreview = new ArgoPlacementPreviewActions(page);
  }

  private byIdSuffix(suffix: string): Locator {
    return this.page.locator(`[id$="${suffix}"]`);
  }

  getWizardNav(): Locator {
    return this.page.locator(`nav[aria-label="${APP_ARGO_PUSH_CREATE_WIZARD.navAccessibleName}"]`);
  }

  getWizardStepButton(stepId: AppArgoPushCreateWizardStepId): Locator {
    return this.getWizardNav().locator(`button#${stepId}`);
  }

  getPageTitle(): Locator {
    return this.page.getByRole('heading', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.pageTitle,
      level: 1,
    });
  }

  getYamlSwitch(): Locator {
    return this.page.locator(`#${APP_ARGO_PUSH_CREATE_WIZARD.yamlSwitchId}`);
  }

  getNextButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.footer.next,
      exact: true,
    });
  }

  getBackButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.footer.back,
      exact: true,
    });
  }

  getCancelButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.footer.cancel,
      exact: true,
    });
  }

  getSubmitButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.footer.submit,
      exact: true,
    });
  }

  /** ApplicationSet name on **General**. */
  getApplicationNameInput(): Locator {
    return this.byIdSuffix(APP_ARGO_PUSH_CREATE_WIZARD.general.nameInputIdSuffix).or(
      this.page.getByPlaceholder(APP_ARGO_PUSH_CREATE_WIZARD.general.namePlaceholder)
    );
  }

  /** Argo server (sets ApplicationSet `metadata.namespace`). */
  getArgoServerCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.general.argoServerComboboxLabel,
    });
  }

  getAddArgoServerModal(): Locator {
    const { modalSelector, titlePattern } = APP_ARGO_PUSH_CREATE_WIZARD.addArgoServerModal;
    return this.page.locator(modalSelector).filter({ hasText: titlePattern });
  }

  getModalSyncEditor(): SyncEditorYamlActions {
    return new SyncEditorYamlActions(
      this.page,
      '__argoPushModalYamlCopy',
      this.getAddArgoServerModal()
    );
  }

  async openAddArgoServerModal(): Promise<void> {
    await this.getArgoServerCombobox().click();
    await this.page
      .getByRole('button', { name: APP_ARGO_PUSH_CREATE_WIZARD.general.addArgoServerButtonLabel })
      .click();
    await this.getAddArgoServerModal().waitFor({ state: 'visible', timeout: 60_000 });
    await this.waitForLoad();
  }

  async closeAddArgoServerModal(): Promise<void> {
    const { cancelButtonLabel } = APP_ARGO_PUSH_CREATE_WIZARD.addArgoServerModal;
    await this.getAddArgoServerModal()
      .getByRole('button', { name: cancelButtonLabel, exact: true })
      .click();
    await this.getAddArgoServerModal().waitFor({ state: 'hidden', timeout: 30_000 });
    await this.waitForLoad();
  }

  /** Cluster Decision Resource requeue time on **Generators**. */
  getRequeueTimeCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.general.requeueTimeComboboxLabel,
    });
  }

  getGitRepositoryTypeCard(): Locator {
    return this.page
      .locator('[data-ouia-component-type="PF6/Card"].pf-m-selectable')
      .filter({ hasText: APP_ARGO_PUSH_CREATE_WIZARD.template.gitRepositoryTypeCardText })
      .first()
      .or(
        this.page
          .locator('[data-ouia-component-type="PF6/Card"]')
          .filter({ hasText: APP_ARGO_PUSH_CREATE_WIZARD.template.gitRepositoryTypeCardText })
          .first()
      );
  }

  getHelmRepositoryTypeCard(): Locator {
    return this.page
      .locator('[data-ouia-component-type="PF6/Card"].pf-m-selectable')
      .filter({ hasText: APP_ARGO_PUSH_CREATE_WIZARD.template.helmRepositoryTypeCardText })
      .first()
      .or(
        this.page
          .locator('[data-ouia-component-type="PF6/Card"]')
          .filter({ hasText: APP_ARGO_PUSH_CREATE_WIZARD.template.helmRepositoryTypeCardText })
          .first()
      );
  }

  getGitUrlCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.template.gitUrlComboboxLabel,
    });
  }

  getGitRevisionCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.template.gitRevisionComboboxLabel,
    });
  }

  getGitPathCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.template.gitPathComboboxLabel,
    });
  }

  getDestinationNamespaceInput(): Locator {
    return this.byIdSuffix(APP_ARGO_PUSH_CREATE_WIZARD.template.destinationInputIdSuffix)
      .or(this.page.getByPlaceholder(APP_ARGO_PUSH_CREATE_WIZARD.template.destinationNamespacePlaceholder))
      .or(this.page.getByRole('textbox', { name: /Remote namespace/i }));
  }

  /** RHACM4K-63608: info alert on **Template** for private repository credentials. */
  getPrivateRepoCredentialsAlert(): Locator {
    const { title } = APP_ARGO_PUSH_CREATE_WIZARD.template.privateRepoCredentialsAlert;
    // PF6 info alerts expose copy via heading ("Info alert: …"), not role="alert" on the root.
    return this.page
      .locator('[class*="c-alert"]')
      .filter({ hasText: title })
      .first();
  }

  getConfigureRepositoryCredentialsButton(): Locator {
    const { configureCredentialsButtonLabel } =
      APP_ARGO_PUSH_CREATE_WIZARD.template.privateRepoCredentialsAlert;
    return this.getPrivateRepoCredentialsAlert().getByRole('button', {
      name: configureCredentialsButtonLabel,
    });
  }

  async expectPrivateRepoCredentialsAlertVisible(): Promise<void> {
    const { title, messageSnippet } = APP_ARGO_PUSH_CREATE_WIZARD.template.privateRepoCredentialsAlert;
    const alert = this.getPrivateRepoCredentialsAlert();
    await expect(alert).toBeVisible({ timeout: 60_000 });
    await expect(alert).toContainText(title);
    await expect(alert).toContainText(messageSnippet);
  }

  /**
   * Clicks **Configure repository credentials** and returns the new GitOps settings tab.
   * Caller should close the tab when finished.
   */
  async openGitOpsRepositorySettingsFromAlert(): Promise<Page> {
    const [settingsPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.getConfigureRepositoryCredentialsButton().click(),
    ]);
    await settingsPage.waitForLoadState('domcontentloaded');
    return settingsPage;
  }

  getClusterSetsCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.placement.clusterSetsComboboxLabel,
    });
  }

  getLabelExpressionsRegion(): Locator {
    return this.page.getByRole('region', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.placement.labelExpressionsRegionLabel,
    });
  }

  getLastLabelExpressionGroup(): Locator {
    return this.getLabelExpressionsRegion().locator('.pf-v6-c-form__field-group').last();
  }

  getAddLabelExpressionButton(): Locator {
    const { addLabelExpressionButtonLabel, addLabelExpressionButtonAriaLabel } =
      APP_ARGO_PUSH_CREATE_WIZARD.placement;
    return this.getLabelExpressionsRegion()
      .getByRole('button', { name: addLabelExpressionButtonLabel })
      .or(
        this.getLabelExpressionsRegion()
          .getByRole('button', { name: addLabelExpressionButtonAriaLabel })
          .filter({ hasText: addLabelExpressionButtonLabel })
      )
      .first();
  }

  getPlacementLabelCombobox(): Locator {
    return this.getLastLabelExpressionGroup().getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.placement.labelComboboxLabel,
    });
  }

  getPlacementValuesCombobox(): Locator {
    return this.getLastLabelExpressionGroup().getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.placement.valuesComboboxLabel,
    });
  }

  /** `#review` summary pane on the **Review** step (not the side-nav `#review-step` button). */
  getReviewPane(): Locator {
    return this.page.locator(`#${APP_ARGO_PUSH_CREATE_WIZARD.review.panelId}`);
  }

  getReviewSearchInput(): Locator {
    return this.getReviewPane().getByPlaceholder(APP_ARGO_PUSH_CREATE_WIZARD.review.searchPlaceholder);
  }

  getReviewCollapseAllButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.review.collapseAllButtonLabel,
      exact: true,
    });
  }

  getReviewExpandAllButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.review.expandAllButtonLabel,
      exact: true,
    });
  }

  getSyncEditorContainer(): Locator {
    return this.page.locator(APP_ARGO_PUSH_CREATE_WIZARD.review.syncEditorContainerSelector);
  }

  getSyncEditorMonacoTextarea(): Locator {
    return this.page.locator(APP_ARGO_PUSH_CREATE_WIZARD.review.syncEditorMonacoTextareaSelector).first();
  }

  getSyncEditorToolbarSearchButton(): Locator {
    return this.page.locator(`#${APP_ARGO_PUSH_CREATE_WIZARD.review.syncEditorToolbarSearchButtonId}`);
  }

  /**
   * Expandable section toggle inside `#review` (PF link on `div#general`, `div#generators`, …).
   * Side-nav step buttons also use labels like **General** — do not use `getByRole` alone.
   */
  getReviewSectionToggle(sectionLabel: string): Locator {
    const sectionId =
      APP_ARGO_PUSH_CREATE_WIZARD.review.sectionIds[
        sectionLabel as keyof typeof APP_ARGO_PUSH_CREATE_WIZARD.review.sectionIds
      ];
    if (sectionId) {
      return this.getReviewPane()
        .locator(
          `#${sectionId}.${APP_ARGO_PUSH_CREATE_WIZARD.review.expandableSectionClass} button.pf-m-link`
        )
        .first();
    }
    return this.getReviewPane()
      .locator(`.${APP_ARGO_PUSH_CREATE_WIZARD.review.expandableSectionClass}`)
      .filter({ hasText: new RegExp(`^${sectionLabel}`) })
      .locator('button.pf-m-link')
      .first();
  }

  getReviewSectionRegion(sectionLabel: string): Locator {
    return this.getReviewPane().getByRole('region', { name: sectionLabel });
  }

  /** Pen-hover review row within `scope`. */
  private getReviewPenFieldRowInScope(scope: Locator, fieldLabel: string | RegExp): Locator {
    return scope
      .locator(`.${APP_ARGO_PUSH_CREATE_WIZARD.review.reviewRowClass}`, {
        has: this.page.getByText(fieldLabel),
      })
      .first();
  }

  private resolveReviewPenRow(fieldLabel: string | RegExp, sectionLabel?: string): Locator {
    return sectionLabel
      ? this.getReviewPenFieldRowInSection(sectionLabel, fieldLabel)
      : this.getReviewPenFieldRow(fieldLabel);
  }

  /** Pen-hover review row scoped to a section (filled wizard summary fields). */
  private getReviewPenFieldRowInSection(
    sectionLabel: string,
    fieldLabel: string | RegExp
  ): Locator {
    return this.getReviewPenFieldRowInScope(this.getReviewSectionRegion(sectionLabel), fieldLabel);
  }

  private getReviewPenFieldRow(fieldLabel: string | RegExp): Locator {
    return this.getReviewPenFieldRowInScope(this.getReviewPane(), fieldLabel);
  }

  /** Review detail row for a field label within `scope` (#review pane or a section region). */
  private getReviewFieldRowInScope(scope: Locator, fieldLabel: string | RegExp): Locator {
    const byPenRow = this.getReviewPenFieldRowInScope(scope, fieldLabel);
    const byAccessibleName = scope.getByRole('button', {
      name: reviewFieldAccessibleNamePattern(fieldLabel),
    });
    const byDetailButton = scope.getByRole('button').filter({
      has: this.page.getByText(fieldLabel),
    });
    return byPenRow.or(byAccessibleName).or(byDetailButton).first();
  }

  /** Review detail row for a field label (e.g. **Name**, **Argo server**). */
  getReviewFieldRow(fieldLabel: string | RegExp): Locator {
    return this.getReviewFieldRowInScope(this.getReviewPane(), fieldLabel);
  }

  /** Field row scoped to a review section (avoids cross-section label collisions). */
  getReviewFieldRowInSection(
    sectionLabel: string,
    fieldLabel: string | RegExp
  ): Locator {
    return this.getReviewFieldRowInScope(this.getReviewSectionRegion(sectionLabel), fieldLabel);
  }

  private getReviewHighlightButton(penRow: Locator): Locator {
    return penRow
      .getByRole('button', { name: APP_ARGO_PUSH_CREATE_WIZARD.review.highlightYamlButtonLabel })
      .first();
  }

  /**
   * Highlights a review field in the YAML editor via the arrow **Highlight in YAML** button
   * shown on row hover while the YAML split panel is expanded.
   */
  async clickReviewHighlightForField(
    fieldLabel: string | RegExp,
    sectionLabel?: string
  ): Promise<void> {
    await this.expandYamlPanel();
    await this.getSyncEditorMonacoTextarea().waitFor({ state: 'visible', timeout: 60_000 });

    const penRow = this.resolveReviewPenRow(fieldLabel, sectionLabel);
    await penRow.scrollIntoViewIfNeeded();
    await penRow.waitFor({ state: 'visible', timeout: 15_000 });

    await penRow.hover();
    const highlight = this.getReviewHighlightButton(penRow);
    await highlight.waitFor({ state: 'visible', timeout: 15_000 });
    await highlight.click({ force: true });
    await this.waitForLoad();
  }

  async clickReviewEditForField(fieldLabel: string | RegExp, sectionLabel?: string): Promise<void> {
    const penRow = this.resolveReviewPenRow(fieldLabel, sectionLabel);
    await penRow.hover();
    await penRow.locator(`.${APP_ARGO_PUSH_CREATE_WIZARD.review.editButtonClass}`).first().click({
      force: true,
    });
    await this.waitForLoad();
  }

  getSyncPolicyCheckboxBySuffix(
    suffixId: keyof typeof APP_ARGO_PUSH_CREATE_WIZARD.syncCheckboxSuffixIds
  ): Locator {
    const suffix = APP_ARGO_PUSH_CREATE_WIZARD.syncCheckboxSuffixIds[suffixId];
    return this.byIdSuffix(`;id=${suffix}`);
  }

  async openFromApplicationsList(listPage: ApplicationListPage): Promise<void> {
    await listPage.goto();
    await listPage.openCreateApplication();
    await this.page.locator(`#${APP_CREATE_MENU.optionIds.argoPushModel}`).click();
    await this.waitForLoad();
    await this.getPageTitle().waitFor({ state: 'visible', timeout: 120_000 });
    await this.getApplicationNameInput().waitFor({ state: 'visible', timeout: 60_000 });
  }

  private getYamlSwitchLabel(): Locator {
    return this.page.locator(`label[for="${APP_ARGO_PUSH_CREATE_WIZARD.yamlSwitchId}"]`);
  }

  async isYamlPanelExpanded(): Promise<boolean> {
    const yaml = this.getYamlSwitch();
    if (!(await yaml.isVisible().catch(() => false))) return false;
    return yaml.isChecked();
  }

  /** Turn YAML split panel **off** (clicks PF switch label — input is pointer-intercepted). */
  async collapseYamlPanel(): Promise<void> {
    if (!(await this.isYamlPanelExpanded())) return;
    await this.getYamlSwitchLabel().click({ force: true });
    await this.waitForLoad();
  }

  /** Turn YAML split panel **on**. */
  async expandYamlPanel(): Promise<void> {
    if (await this.isYamlPanelExpanded()) return;
    await this.getYamlSwitchLabel().click({ force: true });
    await this.waitForLoad();
    await this.getSyncEditorContainer().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async clickReviewSectionToggle(sectionLabel: string): Promise<void> {
    await this.getReviewSectionToggle(sectionLabel).click();
    await this.waitForLoad();
  }

  async expectReviewSectionExpanded(sectionLabel: string, expanded: boolean): Promise<void> {
    await expect(this.getReviewSectionToggle(sectionLabel)).toHaveAttribute(
      'aria-expanded',
      expanded ? 'true' : 'false'
    );
  }

  /** Monaco overlay decoration count used for review field ↔ YAML highlighting. */
  async getMonacoHighlightDecorationCount(): Promise<number> {
    return this.page.evaluate(
      () => document.querySelectorAll('.monaco-editor .view-overlays .cdr').length
    );
  }

  /** Fold the first expanded YAML block in the sync editor (Monaco gutter). */
  async foldFirstYamlBlockInSyncEditor(): Promise<void> {
    const foldToggle = this.page
      .locator(APP_ARGO_PUSH_CREATE_WIZARD.review.monacoFoldExpandedSelector)
      .first();
    await foldToggle.click({ force: true });
    await this.waitForLoad();
  }

  async pickPlacementOperatorOption(optionPattern: string | RegExp): Promise<void> {
    const group = this.getLastLabelExpressionGroup();
    const operatorCombobox = group.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.placement.operatorComboboxLabel,
    });

    if (await operatorCombobox.isVisible().catch(() => false)) {
      await this.pickComboboxOption(operatorCombobox, optionPattern);
      return;
    }

    const operatorButton = group.getByRole('button', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.placement.operatorButtonLabel,
    });
    const currentOperator = ((await operatorButton.innerText()) ?? '').trim();
    const alreadySelected =
      typeof optionPattern === 'string'
        ? currentOperator === optionPattern
        : optionPattern.test(currentOperator);
    if (alreadySelected) return;

    await operatorButton.click();
    const option = this.page.getByRole('option', { name: optionPattern }).first();
    await option.waitFor({ state: 'visible', timeout: 60_000 });
    await option.click();
    await this.waitForLoad();
  }

  async fillPlacementLabelExpression(expression: ArgoPushPlacementLabelExpression): Promise<void> {
    const { labelName, labelValues } = expression;
    const operatorPattern =
      APP_ARGO_PUSH_CREATE_WIZARD.placement.operatorInMenuLabel;

    await this.getLabelExpressionsRegion().scrollIntoViewIfNeeded();
    await this.getAddLabelExpressionButton().waitFor({ state: 'visible', timeout: 60_000 });
    await this.getAddLabelExpressionButton().click();
    await this.waitForLoad();

    await this.pickComboboxOption(this.getPlacementLabelCombobox(), labelName);
    await this.pickPlacementOperatorOption(operatorPattern);

    const valuesCombo = this.getPlacementValuesCombobox();
    await valuesCombo.click();
    for (const value of labelValues) {
      const option = this.page.getByRole('option', { name: value }).first();
      await option.waitFor({ state: 'visible', timeout: 60_000 });
      await option.click();
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.waitForLoad();
  }

  async expectOnReviewStep(): Promise<void> {
    await expect(this.getWizardStepButton(APP_ARGO_PUSH_CREATE_WIZARD.steps.review)).toHaveAttribute(
      'aria-current',
      'step'
    );
    await expect(this.getReviewPane()).toBeVisible({ timeout: 60_000 });
  }

  /** Restore Review + YAML for follow-on checks when a prior action left another step active. */
  async ensureOnReviewStepWithYamlExpanded(): Promise<void> {
    if (!(await this.getReviewPane().isVisible().catch(() => false))) {
      await this.clickWizardStep(APP_ARGO_PUSH_CREATE_WIZARD.steps.review);
      await this.expectOnReviewStep();
    }
    await this.expandYamlPanel();
    await this.getSyncEditorMonacoTextarea().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async expectOnWizardStep(stepId: AppArgoPushCreateWizardStepId): Promise<void> {
    await expect(this.getWizardStepButton(stepId)).toHaveAttribute('aria-current', 'step');
  }

  async clickWizardStep(stepId: AppArgoPushCreateWizardStepId): Promise<void> {
    await this.getWizardStepButton(stepId).click();
    await this.waitForLoad();
    if (stepId === APP_ARGO_PUSH_CREATE_WIZARD.steps.placement) {
      await this.tolerations.getTolerationsSectionHeading().waitFor({ state: 'visible', timeout: 60_000 });
    }
  }

  async clickNext(): Promise<void> {
    const next = this.getNextButton();
    await expect(next).toBeEnabled({ timeout: 60_000 });
    await next.click();
    await this.waitForLoad();
  }

  async clickSubmit(): Promise<void> {
    const submit = this.getSubmitButton();
    await expect(submit).toBeEnabled({ timeout: 60_000 });
    await submit.click();
    await this.waitForLoad();
  }

  /**
   * Opens a PF combobox and selects the first visible `role=option` whose text matches `optionPattern`.
   */
  async pickComboboxOption(combobox: Locator, optionPattern: string | RegExp): Promise<void> {
    await combobox.click();
    const option = this.page.getByRole('option', { name: optionPattern }).first();
    await option.waitFor({ state: 'visible', timeout: 60_000 });
    await option.click();
    await this.waitForLoad();
  }

  /** Git URL on **Template** — Cypress `pfSelect('#repourl-form-group')` parity. */
  async pickGitUrlOption(url: string): Promise<void> {
    await this.pickPfComboboxByTyping(this.getGitUrlCombobox(), url);
  }

  /** Git revision on **Template** — pick branch from menu or type when creatable. */
  async pickGitRevisionOption(revision: string): Promise<void> {
    await this.pickPfComboboxByTyping(this.getGitRevisionCombobox(), revision);
  }

  /**
   * PF combobox/typeahead: type `value`, wait for menu options, click matching or first item (Cypress `pfSelect`).
   */
  async pickPfComboboxByTyping(combobox: Locator, value: string): Promise<void> {
    await combobox.click();
    await combobox.fill('');
    await combobox.pressSequentially(value, { delay: 25 });

    const namedOption = this.page.getByRole('option', { name: value }).first();
    await expect
      .poll(async () => {
        if (await namedOption.isVisible().catch(() => false)) return 'named';
        const options = this.page.getByRole('option');
        const count = await options.count();
        if (count === 0) return false;
        const firstText = ((await options.first().innerText()) ?? '').toLowerCase();
        if (firstText.includes('no results')) return false;
        return 'first';
      }, { timeout: 60_000 })
      .not.toBe(false);

    if (await namedOption.isVisible().catch(() => false)) {
      await namedOption.click();
    } else {
      await this.page.getByRole('option').first().click();
    }
    await this.waitForLoad();
  }

  /**
   * PF creatable combobox: select `value` from the menu when present, otherwise fill + Enter.
   */
  async pickCreatableComboboxValue(combobox: Locator, value: string): Promise<void> {
    await combobox.click();
    const option = this.page.getByRole('option', { name: value }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    } else {
      await combobox.fill(value);
      await combobox.press('Enter');
    }
    await this.waitForLoad();
  }

  /**
   * Git path on **Template** — selects menu option when listed, otherwise types the path (creatable combobox).
   */
  async pickGitPathOption(path: string): Promise<void> {
    await this.pickGitPathOptionInCombobox(this.getGitPathCombobox(), path);
  }

  /** Git path combobox scoped to a template source section. */
  async pickGitPathOptionInCombobox(pathCombo: Locator, path: string): Promise<void> {
    await pathCombo.click();
    const pathOption = this.page.getByRole('option', { name: path }).first();
    if (await pathOption.isVisible().catch(() => false)) {
      await pathOption.click();
    } else {
      await pathCombo.fill(path);
      await pathCombo.press('Enter');
    }
    await this.waitForLoad();
  }

  /** Select first menu option (when any option is acceptable). */
  async pickFirstComboboxOption(combobox: Locator): Promise<void> {
    await combobox.click();
    const option = this.page.getByRole('option').first();
    await option.waitFor({ state: 'visible', timeout: 60_000 });
    await option.click();
    await this.waitForLoad();
  }

  /** Template source block (`#spec-template-spec-sources-1`, …) or PF **Source repository** group. */
  getTemplateSourceSection(index: number): Locator {
    const byId = this.page.locator(`#spec-template-spec-sources-${index}`);
    const byHeading = this.page
      .getByRole('heading', { name: /Source repository|Git repository|Helm repository/i, level: 6 })
      .nth(index - 1)
      .locator(
        'xpath=ancestor::*[contains(@class,"field-group") or contains(@class,"accordion")][1]'
      );
    return byId.or(byHeading);
  }

  getAddTemplateSourceButton(): Locator {
    // Accessible name is often "Action"; visible text is "Add another repository".
    return this.page.getByRole('button').filter({ hasText: 'Add another repository' });
  }

  private getRepositoryTypeControlInSection(
    section: Locator,
    type: 'git' | 'helm'
  ): Locator {
    const tileSelector = type === 'git' ? '#tile-git' : '#tile-helm';
    const tile = section.locator(`#repositorytype-form-group ${tileSelector}`);
    const cardText =
      type === 'git'
        ? APP_ARGO_PUSH_CREATE_WIZARD.template.gitRepositoryTypeCardText
        : APP_ARGO_PUSH_CREATE_WIZARD.template.helmRepositoryTypeCardText;
    const cardInSection = section
      .locator('[data-ouia-component-type="PF6/Card"].pf-m-selectable')
      .filter({ hasText: cardText })
      .first();
    const cardOnPage =
      type === 'git' ? this.getGitRepositoryTypeCard() : this.getHelmRepositoryTypeCard();
    return cardInSection.or(cardOnPage).or(tile);
  }

  /** **Template** step — Git repository type (PF6 card, legacy tile; never the hidden radio input). */
  async selectGitRepositoryTypeOnTemplate(): Promise<void> {
    const card = this.getGitRepositoryTypeCard();
    if (await card.isVisible().catch(() => false)) {
      await card.scrollIntoViewIfNeeded();
      await card.click();
      await this.waitForLoad();
      return;
    }
    const tile = this.page.locator('#repositorytype-form-group #tile-git');
    if ((await tile.count()) > 0) {
      await tile.click();
      await this.waitForLoad();
    }
  }

  /** **Template** step — Helm repository type (PF6 card, legacy tile). */
  async selectHelmRepositoryTypeOnTemplate(): Promise<void> {
    const card = this.getHelmRepositoryTypeCard();
    if (await card.isVisible().catch(() => false)) {
      await card.scrollIntoViewIfNeeded();
      await card.click();
      await this.waitForLoad();
      return;
    }
    const tile = this.page.locator('#repositorytype-form-group #tile-helm');
    if ((await tile.count()) > 0) {
      await tile.click();
      await this.waitForLoad();
    }
  }

  async selectGitRepositoryTypeInSection(section: Locator): Promise<void> {
    const card = this.getRepositoryTypeControlInSection(section, 'git');
    if ((await card.count()) > 0 && (await card.first().isVisible().catch(() => false))) {
      await card.first().scrollIntoViewIfNeeded();
      await card.first().click();
    } else {
      await this.selectGitRepositoryTypeOnTemplate();
    }
    await this.waitForLoad();
  }

  async selectHelmRepositoryTypeInSection(section: Locator): Promise<void> {
    const card = this.getRepositoryTypeControlInSection(section, 'helm');
    if ((await card.count()) > 0 && (await card.first().isVisible().catch(() => false))) {
      await card.first().scrollIntoViewIfNeeded();
      await card.first().click();
    } else {
      await this.selectHelmRepositoryTypeOnTemplate();
    }
    await this.waitForLoad();
  }

  private scopedCombobox(section: Locator, groupId: string): Locator {
    const inSection = section.locator(`#${groupId}`).getByRole('combobox');
    const onPage = this.page.locator(`#${groupId}`).getByRole('combobox');
    return inSection.or(onPage).first();
  }

  private getGitUrlComboboxInSection(section: Locator): Locator {
    return section
      .getByRole('combobox', { name: APP_ARGO_PUSH_CREATE_WIZARD.template.gitUrlComboboxLabel })
      .or(this.getGitUrlCombobox())
      .first();
  }

  private getGitRevisionComboboxInSection(section: Locator): Locator {
    return section
      .getByRole('combobox', { name: APP_ARGO_PUSH_CREATE_WIZARD.template.gitRevisionComboboxLabel })
      .or(this.getGitRevisionCombobox())
      .first();
  }

  private getGitPathComboboxInSection(section: Locator): Locator {
    return section
      .getByRole('combobox', { name: APP_ARGO_PUSH_CREATE_WIZARD.template.gitPathComboboxLabel })
      .or(this.getGitPathCombobox())
      .first();
  }

  private getHelmUrlComboboxInSection(section: Locator): Locator {
    return section
      .getByRole('combobox', { name: /Enter or select.*URL/i })
      .or(this.page.getByRole('combobox', { name: /Enter or select.*URL/i }))
      .last();
  }

  private templateBlockForRemoveButton(removeButton: Locator): Locator {
    return removeButton.locator(
      'xpath=ancestor::*[.//h6 or .//*[@data-ouia-component-type="PF6/Card"]][1]'
    );
  }

  private async templateBlockMatchesSourceType(
    section: Locator,
    type: 'git' | 'helm'
  ): Promise<boolean> {
    if (type === 'git') {
      const hasGitCombo =
        (await section.getByRole('combobox', { name: /Git URL/i }).count()) > 0;
      const hasGitHeading = (await section.getByText(/Git repository/i).count()) > 0;
      const hasLegacyTile = (await section.locator('#tile-git').count()) > 0;
      return hasGitCombo || hasGitHeading || hasLegacyTile;
    }
    const hasChart =
      (await section.getByRole('textbox', { name: /chart/i }).count()) > 0 ||
      (await section.locator('#chart-form-group input#chart').count()) > 0;
    const hasHelmHeading = (await section.getByText(/Helm repository/i).count()) > 0;
    const hasLegacyTile = (await section.locator('#tile-helm').count()) > 0;
    return hasChart || hasHelmHeading || hasLegacyTile;
  }

  async removeTemplateSourceByType(type: 'git' | 'helm'): Promise<void> {
    const removeButtons = this.page.getByRole('button', { name: /^Remove item$/i });
    const total = await removeButtons.count();
    for (let i = 0; i < total; i++) {
      const section = this.templateBlockForRemoveButton(removeButtons.nth(i));
      if (await this.templateBlockMatchesSourceType(section, type)) {
        await removeButtons.nth(i).scrollIntoViewIfNeeded();
        await removeButtons.nth(i).click();
        await this.waitForLoad();
        return;
      }
    }
    throw new Error(`removeTemplateSourceByType: no ${type} template source section found`);
  }

  async fillGitSourceInSection(section: Locator, git: ArgoPushGitRepositorySpec): Promise<void> {
    await this.selectGitRepositoryTypeInSection(section);
    const repoUrlCombo = this.getGitUrlComboboxInSection(section);
    await this.pickPfComboboxByTyping(repoUrlCombo, git.url);
    const revisionCombo = this.getGitRevisionComboboxInSection(section);
    if (git.branch) {
      await this.pickPfComboboxByTyping(revisionCombo, git.branch);
    } else {
      await this.pickFirstComboboxOption(revisionCombo);
    }
    const pathCombo = this.getGitPathComboboxInSection(section);
    if (git.path) {
      await this.pickGitPathOptionInCombobox(pathCombo, git.path);
    } else {
      await this.pickFirstComboboxOption(pathCombo);
    }
  }

  async fillHelmSourceInSection(section: Locator, helm: ArgoPushHelmRepositorySpec): Promise<void> {
    await this.selectHelmRepositoryTypeInSection(section);
    const repoUrlCombo = this.getHelmUrlComboboxInSection(section);
    await this.pickPfComboboxByTyping(repoUrlCombo, helm.url);
    const chartInput = section
      .getByRole('textbox', { name: /chart/i })
      .or(this.page.getByLabel(/chart/i))
      .or(section.locator('#chart-form-group input#chart'))
      .or(this.page.locator('#chart-form-group input#chart'))
      .first();
    await chartInput.fill(helm.chartName);
    const versionInput = section
      .getByRole('textbox', { name: /version|revision/i })
      .or(section.locator('#targetrevision-form-group input#targetrevision'))
      .or(this.page.locator('#targetrevision-form-group input#targetrevision'))
      .first();
    await versionInput.fill(helm.packageVersion);
  }

  async addTemplateSource(): Promise<void> {
    const addButton = this.getAddTemplateSourceButton();
    await addButton.scrollIntoViewIfNeeded();
    await addButton.click();
    await this.waitForLoad();
  }

  /** Git fields on the last **Template** repository block (multi-source edit add). */
  async fillGitOnLastTemplateSection(git: ArgoPushGitRepositorySpec): Promise<void> {
    const gitCards = this.page
      .locator('[data-ouia-component-type="PF6/Card"]')
      .filter({ hasText: APP_ARGO_PUSH_CREATE_WIZARD.template.gitRepositoryTypeCardText });
    const gitCard = gitCards.last();
    await gitCard.scrollIntoViewIfNeeded();
    await gitCard.click({ force: true });
    await this.waitForLoad();

    const repoUrlCombo = this.page.getByRole('combobox', { name: /Git URL/i }).last();
    await this.pickPfComboboxByTyping(repoUrlCombo, git.url);
    const revisionCombo = this.page
      .getByRole('combobox', { name: /tracking revision/i })
      .last();
    if (git.branch) {
      await this.pickPfComboboxByTyping(revisionCombo, git.branch);
    } else {
      await this.pickFirstComboboxOption(revisionCombo);
    }
    const pathCombo = this.page.getByRole('combobox', { name: /repository path/i }).last();
    if (git.path) {
      await this.pickGitPathOptionInCombobox(pathCombo, git.path);
    } else {
      await this.pickFirstComboboxOption(pathCombo);
    }
  }

  /** Helm fields on the last **Template** repository block (multi-source). */
  async fillHelmOnLastTemplateSection(helm: ArgoPushHelmRepositorySpec): Promise<void> {
    const helmCards = this.page
      .locator('[data-ouia-component-type="PF6/Card"]')
      .filter({ hasText: APP_ARGO_PUSH_CREATE_WIZARD.template.helmRepositoryTypeCardText });
    const helmCard = (await helmCards.count()) > 1 ? helmCards.nth(1) : helmCards.last();
    await helmCard.scrollIntoViewIfNeeded();
    await helmCard.click({ force: true });
    await this.waitForLoad();

    const repoUrlCombo = this.page.getByRole('combobox', { name: /Enter or select.*URL/i }).last();
    await this.pickPfComboboxByTyping(repoUrlCombo, helm.url);

    const chartInput = this.page.getByRole('textbox', { name: /chart/i }).last();
    if ((await chartInput.count()) > 0) {
      await chartInput.fill(helm.chartName);
    } else {
      await this.page.locator('#chart-form-group input#chart').last().fill(helm.chartName);
    }

    const versionInput = this.page
      .getByRole('textbox', { name: /version|revision/i })
      .last()
      .or(this.page.locator('#targetrevision-form-group input#targetrevision').last());
    await versionInput.fill(helm.packageVersion);
  }

  /** Opens list row **Edit application** and lands on the push-model wizard. */
  async openEditFromApplicationsList(
    listPage: ApplicationListPage,
    applicationSetName: string
  ): Promise<void> {
    const table = listPage.applicationsTable;
    await listPage.goto();
    await table.search(applicationSetName);
    const row = table.getRowByName(applicationSetName);
    await table.openRowActions(row);
    await table.clickEditApplicationMenuItem();
    await this.waitForLoad();
    await this.getApplicationNameInput().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async clickTemplateWizardStep(): Promise<void> {
    const templateStep = this.getWizardStepButton(APP_ARGO_PUSH_CREATE_WIZARD.steps.template).or(
      this.page.locator('button#template')
    );
    await templateStep.first().click();
    await this.waitForLoad();
  }

  /** Template → Sync → Placement → Review → Submit (edit flow). */
  async advanceFromTemplateThroughSubmit(): Promise<void> {
    await this.clickNext();
    await this.clickNext();
    await this.clickNext();
    await this.clickSubmit();
  }

  async expectOnCreateRoute(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${APP_ROUTES.createArgoPush.replace(/\//g, '\\/')}$`));
  }

  /** General → Sync policy, then **Placement** (RHACM4K-64219). */
  async fillStepsBeforePlacement(options: FillArgoAppsetBeforePlacementOptions): Promise<void> {
    await fillArgoAppsetWizardBeforePlacement(this.page, options);
    await this.waitForLoad();
  }

  async gotoApplicationSetOverview(argoServerNamespace: string, applicationSetName: string): Promise<void> {
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${APP_ROUTES.argoPushTopology(argoServerNamespace, applicationSetName)}`);
    await this.waitForLoad();
  }

  async expectPostSubmitTopologyUrl(
    argoServerNamespace: string,
    applicationSetName: string,
    options?: { timeout?: number }
  ): Promise<void> {
    const expectedPath = normalizeConsolePathname(
      APP_ROUTES.detailsTab(
        argoServerNamespace,
        applicationSetName,
        APP_APPLICATION_DETAILS.tabs.topology.slug
      )
    );
    const expectedApiVersion = APP_ARGO_PUSH_CREATE_WIZARD.postSubmitOverviewQuery
      .split('=')
      .at(-1);
    await expect(this.page).toHaveURL(
      (url) => {
        try {
          const u = new URL(url);
          return (
            normalizeConsolePathname(u.pathname) === expectedPath &&
            u.searchParams.get('apiVersion') === expectedApiVersion
          );
        } catch {
          return false;
        }
      },
      { timeout: options?.timeout ?? 120_000 }
    );
  }
}
