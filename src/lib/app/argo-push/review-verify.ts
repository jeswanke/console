/**
 * Argo CD ApplicationSet push-model wizard — enhanced **Review** step (RHACM4K-63807).
 * Locators on {@link ArgoPushApplicationCreateWizardPage}; assertions live here.
 */
import { expect } from '@playwright/test';

import { APP_ARGO_PUSH_CREATE_WIZARD } from '@constants/app';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';

export async function verifyYamlPanelHiddenOnReview(wizard: ArgoPushApplicationCreateWizardPage): Promise<void> {
  await wizard.collapseYamlPanel();
  await expect(wizard.getSyncEditorContainer()).toBeHidden();
  await expect(wizard.getSyncEditorToolbarSearchButton()).toBeHidden();
}

export async function verifyYamlPanelVisibleOnReview(wizard: ArgoPushApplicationCreateWizardPage): Promise<void> {
  await wizard.expandYamlPanel();
  await expect(wizard.getSyncEditorContainer()).toBeVisible();
}

export async function verifyReviewSectionToggleCollapsesDetails(
  wizard: ArgoPushApplicationCreateWizardPage,
  sectionLabel: string,
  visibleFieldLabel: string | RegExp
): Promise<void> {
  const field = wizard.getReviewFieldRowInSection(sectionLabel, visibleFieldLabel);
  await expect(field).toBeVisible();
  await wizard.clickReviewSectionToggle(sectionLabel);
  await expect(field).toBeHidden();
  await wizard.clickReviewSectionToggle(sectionLabel);
  await expect(field).toBeVisible();
}

export async function verifyReviewCollapseAllAndExpandAll(
  wizard: ArgoPushApplicationCreateWizardPage
): Promise<void> {
  const sampleField = wizard.getReviewFieldRowInSection('General', /^Name$/);

  await wizard.getReviewCollapseAllButton().click();
  await wizard.waitForLoad();
  await expect(sampleField).toBeHidden();
  await expect(wizard.getReviewExpandAllButton()).toBeVisible();
  await expect(wizard.getReviewCollapseAllButton()).toBeHidden();

  await wizard.getReviewExpandAllButton().click();
  await wizard.waitForLoad();
  await expect(sampleField).toBeVisible();
  await expect(wizard.getReviewCollapseAllButton()).toBeVisible();
  await expect(wizard.getReviewExpandAllButton()).toBeHidden();
}

export async function verifyReviewSearchFiltersDetails(
  wizard: ArgoPushApplicationCreateWizardPage,
  searchTerm: string,
  options: { expectVisible: RegExp | string; expectHidden?: RegExp | string }
): Promise<void> {
  const search = wizard.getReviewSearchInput();
  await search.fill(searchTerm);
  await wizard.waitForLoad();

  await expect(wizard.getReviewFieldRow(options.expectVisible)).toBeVisible();
  if (options.expectHidden) {
    await expect(wizard.getReviewFieldRowInSection('General', options.expectHidden)).toBeHidden();
  }

  await search.fill('');
  await wizard.waitForLoad();
}

export async function verifyReviewYamlHighlightForField(
  wizard: ArgoPushApplicationCreateWizardPage,
  fieldLabel: string | RegExp,
  sectionLabel = 'General'
): Promise<void> {
  await wizard.ensureOnReviewStepWithYamlExpanded();
  const before = await wizard.getMonacoHighlightDecorationCount();

  await wizard.clickReviewHighlightForField(fieldLabel, sectionLabel);

  await expect
    .poll(() => wizard.getMonacoHighlightDecorationCount(), {
      timeout: 15_000,
      message: `Expected YAML highlight after clicking Highlight in YAML for "${String(fieldLabel)}"`,
    })
    .toBeGreaterThan(before);

  await wizard.ensureOnReviewStepWithYamlExpanded();
}

export async function verifyReviewYamlHighlightClearsOnYamlEdit(
  wizard: ArgoPushApplicationCreateWizardPage,
  fieldLabel: string | RegExp,
  editSuffix: string,
  sectionLabel = 'General'
): Promise<void> {
  await wizard.ensureOnReviewStepWithYamlExpanded();
  await wizard.clickReviewHighlightForField(fieldLabel, sectionLabel);

  await expect
    .poll(() => wizard.getMonacoHighlightDecorationCount(), {
      timeout: 15_000,
      message: `Expected YAML highlight before editing YAML for "${String(fieldLabel)}"`,
    })
    .toBeGreaterThan(0);

  const peak = await wizard.getMonacoHighlightDecorationCount();

  const textarea = wizard.getSyncEditorMonacoTextarea();
  await textarea.click();
  await textarea.press('End');
  await textarea.pressSequentially(editSuffix);

  await expect
    .poll(() => wizard.getMonacoHighlightDecorationCount(), {
      timeout: 15_000,
      message: 'Expected review YAML field highlight to clear after editing YAML',
    })
    .toBeLessThan(peak);

  await wizard.ensureOnReviewStepWithYamlExpanded();
}

export async function verifyReviewYamlHighlightSkippedWhenBlockFolded(
  wizard: ArgoPushApplicationCreateWizardPage,
  fieldLabel: string | RegExp,
  sectionLabel = 'General'
): Promise<void> {
  await wizard.ensureOnReviewStepWithYamlExpanded();
  await wizard.foldFirstYamlBlockInSyncEditor();

  const countBefore = await wizard.getMonacoHighlightDecorationCount();
  await wizard.clickReviewHighlightForField(fieldLabel, sectionLabel);
  const countAfter = await wizard.getMonacoHighlightDecorationCount();

  expect(countAfter).toBe(countBefore);
  await wizard.ensureOnReviewStepWithYamlExpanded();
}

export async function verifyReviewEditNavigatesToWizardStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: {
    fieldLabel: string | RegExp;
    stepId: keyof typeof APP_ARGO_PUSH_CREATE_WIZARD.steps;
    retainedValue: string;
    formControl: () => ReturnType<ArgoPushApplicationCreateWizardPage['getApplicationNameInput']>;
  }
): Promise<void> {
  await wizard.clickWizardStep(APP_ARGO_PUSH_CREATE_WIZARD.steps.review);
  await wizard.expectOnReviewStep();

  await wizard.clickReviewEditForField(options.fieldLabel, 'General');

  await wizard.expectOnWizardStep(APP_ARGO_PUSH_CREATE_WIZARD.steps[options.stepId]);
  await expect(options.formControl()).toBeVisible();
  await expect(options.formControl()).toHaveValue(options.retainedValue);
}
