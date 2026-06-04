import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import type { OcCliService } from '@services/OcCliService';
import { APP_ARGO_PULL_CREATE_WIZARD, APP_CREATE_MENU, APP_ROUTES } from '@constants/app';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import {
  fillArgoAppsetWizardBeforePlacement,
  type FillArgoAppsetBeforePlacementOptions,
} from '@lib/app/argo/fill-wizard-before-placement';
import { ArgoPlacementPreviewActions } from '@lib/app/argo/placement-preview-actions';
import { PlacementTolerationsActions } from '@lib/placement/tolerations-actions';
import { SyncEditorYamlActions } from '@lib/placement/sync-editor-actions';
import type { PlacementTolerationsWizardHost } from '@lib/placement/tolerations-verify';

type ArgoPullWizardStep = keyof typeof APP_ARGO_PULL_CREATE_WIZARD.steps;

/**
 * Argo CD ApplicationSet **pull model** create wizard.
 *
 * Constants: {@link APP_ARGO_PULL_CREATE_WIZARD} in `src/constants/app.ts`.
 */
export class ArgoPullApplicationCreateWizardPage extends BasePage implements PlacementTolerationsWizardHost {
  readonly tolerations: PlacementTolerationsActions;
  readonly syncEditor: SyncEditorYamlActions;
  readonly placementPreview: ArgoPlacementPreviewActions;

  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
    this.tolerations = new PlacementTolerationsActions(page);
    this.syncEditor = new SyncEditorYamlActions(page, '__argoPullWizardYamlCopy');
    this.placementPreview = new ArgoPlacementPreviewActions(page);
  }

  getPageTitle(): Locator {
    return this.page.getByRole('heading', {
      name: APP_ARGO_PULL_CREATE_WIZARD.pageTitle,
      level: 1,
    });
  }

  getWizardNav(): Locator {
    return this.page.locator(
      `nav[aria-label="${APP_ARGO_PULL_CREATE_WIZARD.navAccessibleName}"]`
    );
  }

  getWizardStepButton(step: ArgoPullWizardStep): Locator {
    return this.getWizardNav().locator(`button#${APP_ARGO_PULL_CREATE_WIZARD.steps[step]}`);
  }

  getArgoServerCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PULL_CREATE_WIZARD.general.argoServerComboboxLabel,
    });
  }

  getAddArgoServerModal(): Locator {
    const { modalSelector, titlePattern } = APP_ARGO_PULL_CREATE_WIZARD.addArgoServerModal;
    return this.page.locator(modalSelector).filter({ hasText: titlePattern });
  }

  getModalSyncEditor(): SyncEditorYamlActions {
    return new SyncEditorYamlActions(
      this.page,
      '__argoPullModalYamlCopy',
      this.getAddArgoServerModal()
    );
  }

  async openFromApplicationsList(listPage: ApplicationListPage): Promise<void> {
    await listPage.goto();
    await listPage.openCreateApplication();
    await this.page.locator(`#${APP_CREATE_MENU.optionIds.argoPullModel}`).click();
    await this.waitForLoad();
    await this.getPageTitle().waitFor({ state: 'visible', timeout: 120_000 });
    await this.getArgoServerCombobox().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async openAddArgoServerModal(): Promise<void> {
    await this.getArgoServerCombobox().click();
    await this.page
      .getByRole('button', { name: APP_ARGO_PULL_CREATE_WIZARD.general.addArgoServerButtonLabel })
      .click();
    await this.getAddArgoServerModal().waitFor({ state: 'visible', timeout: 60_000 });
    await this.waitForLoad();
  }

  async closeAddArgoServerModal(): Promise<void> {
    const { cancelButtonLabel } = APP_ARGO_PULL_CREATE_WIZARD.addArgoServerModal;
    await this.getAddArgoServerModal()
      .getByRole('button', { name: cancelButtonLabel, exact: true })
      .click();
    await this.getAddArgoServerModal().waitFor({ state: 'hidden', timeout: 30_000 });
    await this.waitForLoad();
  }

  async clickWizardStep(step: ArgoPullWizardStep): Promise<void> {
    await this.getWizardStepButton(step).click();
    await this.waitForLoad();
    if (step === 'placement') {
      await this.tolerations.getTolerationsSectionHeading().waitFor({ state: 'visible', timeout: 60_000 });
    }
  }

  async expectOnCreateRoute(): Promise<void> {
    await expect(this.page).toHaveURL(`**${APP_ROUTES.createArgoPull}`);
  }

  /** General → Sync policy, then **Placement** (RHACM4K-64219). */
  async fillStepsBeforePlacement(options: FillArgoAppsetBeforePlacementOptions): Promise<void> {
    await fillArgoAppsetWizardBeforePlacement(this.page, options);
    await this.waitForLoad();
  }
}
