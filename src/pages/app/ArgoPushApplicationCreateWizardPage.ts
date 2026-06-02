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
import { normalizeConsolePathname } from '@utils/console-navigation';

/**
 * Argo CD ApplicationSet **push model** create wizard.
 *
 * **Route:** {@link APP_ROUTES.createArgoPush}
 * **Entry:** Applications list → {@link APP_CREATE_MENU.optionIds.argoPushModel}.
 *
 * Six-step PF Form Wizard (`nav[aria-label="Argo application steps"]`) with optional YAML split panel.
 * Locators follow live hub capture: placeholders and combobox accessible names (few `data-testid`s).
 */
export class ArgoPushApplicationCreateWizardPage extends BasePage {
  constructor(
    page: Page,
    public readonly oc: OcCliService
  ) {
    super(page);
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

  /** Cluster Decision Resource requeue time on **Generators**. */
  getRequeueTimeCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.general.requeueTimeComboboxLabel,
    });
  }

  getGitRepositoryTypeCard(): Locator {
    return this.page
      .locator('[data-ouia-component-type="PF6/Card"]')
      .filter({ hasText: APP_ARGO_PUSH_CREATE_WIZARD.template.gitRepositoryTypeCardText })
      .first();
  }

  getHelmRepositoryTypeCard(): Locator {
    return this.page
      .locator('[data-ouia-component-type="PF6/Card"]')
      .filter({ hasText: APP_ARGO_PUSH_CREATE_WIZARD.template.helmRepositoryTypeCardText })
      .first();
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
    return this.byIdSuffix(APP_ARGO_PUSH_CREATE_WIZARD.template.destinationInputIdSuffix).or(
      this.page.getByPlaceholder(APP_ARGO_PUSH_CREATE_WIZARD.template.destinationNamespacePlaceholder)
    );
  }

  getClusterSetsCombobox(): Locator {
    return this.page.getByRole('combobox', {
      name: APP_ARGO_PUSH_CREATE_WIZARD.placement.clusterSetsComboboxLabel,
    });
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

  /** Turn YAML panel off when the switch is on (form-first flows). */
  async collapseYamlPanel(): Promise<void> {
    const yaml = this.getYamlSwitch();
    if (!(await yaml.isVisible().catch(() => false))) return;
    const on = await yaml.getAttribute('aria-checked');
    if (on === 'true') {
      await yaml.click();
      await this.waitForLoad();
    }
  }

  async clickWizardStep(stepId: AppArgoPushCreateWizardStepId): Promise<void> {
    await this.getWizardStepButton(stepId).click();
    await this.waitForLoad();
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

  /** Select first menu option (when any option is acceptable). */
  async pickFirstComboboxOption(combobox: Locator): Promise<void> {
    await combobox.click();
    const option = this.page.getByRole('option').first();
    await option.waitFor({ state: 'visible', timeout: 60_000 });
    await option.click();
    await this.waitForLoad();
  }

  async expectOnCreateRoute(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${APP_ROUTES.createArgoPush.replace(/\//g, '\\/')}$`));
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
