import { expect, type Locator, type Page } from '@playwright/test';

import { APP_ARGO_CREATE_WIZARD_SHARED } from '@constants/app';
import { APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI } from '@constants/placement-preview';
import {
  getNoClustersMatchWarningInSection,
  type PlacementPreviewWizardHost,
} from '@lib/placement/placement-preview-verify';

type ArgoWizardStepId = (typeof APP_ARGO_CREATE_WIZARD_SHARED.steps)[keyof typeof APP_ARGO_CREATE_WIZARD_SHARED.steps];

/** Placement preview locators and actions for Argo ApplicationSet pull/push create wizards. */
export class ArgoPlacementPreviewActions implements PlacementPreviewWizardHost {
  constructor(private readonly page: Page) {}

  getWizardNav(): Locator {
    return this.page.locator(`nav[aria-label="${APP_ARGO_CREATE_WIZARD_SHARED.navAccessibleName}"]`);
  }

  getWizardStepButton(stepId: ArgoWizardStepId): Locator {
    return this.getWizardNav().locator(`button#${stepId}`);
  }

  getWizardFooter(): Locator {
    return this.page.locator('.pf-v6-c-wizard__footer');
  }

  getNewPlacementButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.placement.newPlacementButtonLabel,
    });
  }

  getExistingPlacementButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.placement.existingPlacementButtonLabel,
    });
  }

  getClusterSetsCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.placement.clusterSetsComboboxLabel,
    });
  }

  getExistingPlacementCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.placement.existingPlacementComboboxLabel,
    });
  }

  getSetLimitCheckbox(): Locator {
    return this.page.getByLabel(APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.placement.setLimitCheckboxLabel);
  }

  /** Argo pull/push: PF NumberInput under "Limit the number of clusters selected" (no sync-editor id). */
  getPlacementLimitNumberInput(): Locator {
    // PF uses <input type="number"> without role="spinbutton" in DOM; getByRole still maps it in a11y.
    return this.page
      .getByText(APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.placement.placementLimitSectionLabel)
      .locator('xpath=ancestor::div[.//input[@type="number"]][1]');
  }

  getPlacementLimitSpinbutton(): Locator {
    return this.getPlacementLimitNumberInput().getByRole('spinbutton');
  }

  getPlacementMatchSummary(): Locator {
    return this.getWizardFooter().filter({
      hasText: APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.footer.matchedByPlacementLabel,
    });
  }

  getPlacementPreviewLink(): Locator {
    return this.getPlacementMatchSummary().getByRole('button', {
      name: APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.footer.previewLinkPattern,
    });
  }

  getPlacementPreviewModal(): Locator {
    return this.page.locator('.pf-v6-c-modal-box').last();
  }

  getReviewPane(): Locator {
    return this.page.locator(`#${APP_ARGO_CREATE_WIZARD_SHARED.review.panelId}`);
  }

  getReviewPlacementSection(): Locator {
    const { placementSectionLabel } = APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.review;
    const { sectionIds, expandableSectionClass } = APP_ARGO_CREATE_WIZARD_SHARED.review;
    const sectionId = sectionIds[placementSectionLabel as keyof typeof sectionIds];
    return this.getReviewPane().locator(
      `#${sectionId}.${expandableSectionClass}, #${sectionId}`
    );
  }

  getReviewInfoPlacementPreviewAlert(): Locator {
    return this.getReviewPlacementSection()
      .locator('.pf-v6-c-alert.pf-m-info')
      .filter({ hasText: APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.alerts.reviewInfoPlacementPreview });
  }

  getNoClustersMatchWarningInReviewPlacement(): Locator {
    return getNoClustersMatchWarningInSection(this.getReviewPlacementSection());
  }

  async clickWizardStep(step: 'placement' | 'review'): Promise<void> {
    const stepId =
      step === 'placement'
        ? APP_ARGO_CREATE_WIZARD_SHARED.steps.placement
        : APP_ARGO_CREATE_WIZARD_SHARED.steps.review;
    await this.getWizardStepButton(stepId).click();
    await expect(this.getWizardStepButton(stepId)).toHaveAttribute('aria-current', 'step', {
      timeout: 60_000,
    });
  }

  async ensureNewPlacementSelected(): Promise<void> {
    const btn = this.getNewPlacementButton();
    await btn.waitFor({ state: 'visible', timeout: 30_000 });
    if ((await btn.getAttribute('aria-pressed')) !== 'true') {
      await btn.click({ force: true });
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  }

  async ensureExistingPlacementSelected(): Promise<void> {
    const btn = this.getExistingPlacementButton();
    await btn.waitFor({ state: 'visible', timeout: 30_000 });
    if ((await btn.getAttribute('aria-pressed')) !== 'true') {
      await btn.click({ force: true });
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  }

  async selectClusterSet(clusterSetName: string): Promise<void> {
    const combo = this.getClusterSetsCombobox().first();
    await combo.click();
    await this.page.getByRole('option', { name: clusterSetName, exact: true }).click();
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.getPlacementPreviewLink().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async selectExistingPlacement(placementName: string): Promise<void> {
    const combo = this.getExistingPlacementCombobox();
    await combo.click();
    await this.page.getByRole('option', { name: placementName, exact: true }).click();
    await this.getPlacementPreviewLink().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async setPlacementLimitEnabled(enabled: boolean): Promise<void> {
    const checkbox = this.getSetLimitCheckbox();
    await checkbox.setChecked(enabled);
    if (enabled) {
      await expect(this.getPlacementLimitSpinbutton()).toBeVisible({ timeout: 30_000 });
    }
  }

  async setPlacementLimitValue(value: number): Promise<void> {
    const spinbutton = this.getPlacementLimitSpinbutton();
    await spinbutton.fill(String(value));
    await this.getPlacementPreviewLink().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async decrementPlacementLimit(): Promise<void> {
    await this.getPlacementLimitNumberInput()
      .getByRole('button', { name: 'Minus' })
      .click();
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
    await this.clickWizardStep('review');
  }

  async expandReviewPlacementSection(): Promise<void> {
    const { placementSectionLabel } = APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI.review;
    const { sectionIds, expandableSectionClass } = APP_ARGO_CREATE_WIZARD_SHARED.review;
    const sectionId = sectionIds[placementSectionLabel as keyof typeof sectionIds];
    const toggle = this.getReviewPane()
      .locator(`#${sectionId}.${expandableSectionClass} button.pf-m-link`)
      .first();
    if ((await toggle.getAttribute('aria-expanded').catch(() => null)) !== 'true') {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 30_000 });
  }
}
