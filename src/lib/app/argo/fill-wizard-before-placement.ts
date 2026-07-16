import { expect, type Locator, type Page } from '@playwright/test';

import { APP_ARGO_CREATE_WIZARD_SHARED } from '@constants/app';
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';

/** Maps e2e-spec `argoPush` payload to pre-Placement wizard fill (unique `applicationName` per run). */
export function fillOptionsFromArgoPush(
  options: CreateArgoPushApplicationOptions,
  applicationName: string
): FillArgoAppsetBeforePlacementOptions {
  return {
    applicationName,
    argoServerLabel: options.argoServerLabel,
    destinationNamespace: options.destinationNamespace,
    git: options.git,
    collapseYamlPanel: options.collapseYamlPanel,
    requeueTimeSeconds: options.requeueTimeSeconds,
  };
}

export type FillArgoAppsetBeforePlacementOptions = {
  applicationName: string;
  argoServerLabel: string;
  destinationNamespace: string;
  git?: {
    url: string;
    branch?: string;
    path?: string;
  };
  requeueTimeSeconds?: number;
  collapseYamlPanel?: boolean;
};

async function clickNext(page: Page): Promise<void> {
  const next = page.getByRole('button', {
    name: APP_ARGO_CREATE_WIZARD_SHARED.footer.next,
    exact: true,
  });
  await expect(next).toBeEnabled({ timeout: 60_000 });
  await next.click();
}

async function pickComboboxOption(
  page: Page,
  combobox: Locator,
  optionPattern: string | RegExp
): Promise<void> {
  await combobox.click();
  const option = page.getByRole('option', { name: optionPattern }).first();
  await option.waitFor({ state: 'visible', timeout: 60_000 });
  await option.click();
}

async function pickCreatableComboboxOption(
  page: Page,
  combobox: Locator,
  value: string
): Promise<void> {
  await combobox.click();
  const option = page.getByRole('option', { name: value }).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    return;
  }
  await combobox.fill(value);
  const optionAfterType = page.getByRole('option', { name: value }).first();
  if (await optionAfterType.isVisible().catch(() => false)) {
    await optionAfterType.click();
  } else {
    await combobox.press('Enter');
  }
}

async function pickFirstComboboxOption(page: Page, combobox: Locator): Promise<void> {
  await combobox.click();
  const option = page.getByRole('option').first();
  await option.waitFor({ state: 'visible', timeout: 60_000 });
  await option.click();
}

async function pickGitPathOption(page: Page, path: string): Promise<void> {
  const pathCombo = page.getByRole('combobox', {
    name: APP_ARGO_CREATE_WIZARD_SHARED.template.gitPathComboboxLabel,
  });
  await pathCombo.click();
  const pathOption = page.getByRole('option', { name: path }).first();
  if (await pathOption.isVisible().catch(() => false)) {
    await pathOption.click();
  } else {
    await pathCombo.fill(path);
    await pathCombo.press('Enter');
  }
}

async function collapseYamlPanelIfExpanded(page: Page): Promise<void> {
  const { yamlSwitchId } = APP_ARGO_CREATE_WIZARD_SHARED;
  const yamlSwitch = page.locator(`#${yamlSwitchId}`);
  const expanded = await yamlSwitch
    .getAttribute('aria-checked')
    .then((v) => v === 'true')
    .catch(() => false);
  if (expanded) {
    await page.locator(`label[for="${yamlSwitchId}"]`).click({ force: true });
  }
}

/**
 * Fills Argo pull/push create wizard steps through **Sync policy** and lands on **Placement**
 * (matches manual testcase: complete steps 1–2 before step 3 Placement preview).
 */
export async function fillArgoAppsetWizardBeforePlacement(
  page: Page,
  options: FillArgoAppsetBeforePlacementOptions
): Promise<void> {
  const W = APP_ARGO_CREATE_WIZARD_SHARED;
  const { applicationName, argoServerLabel, destinationNamespace, git, requeueTimeSeconds } =
    options;

  if (options.collapseYamlPanel !== false) {
    await collapseYamlPanelIfExpanded(page);
  }

  await page
    .locator(`[id$="${W.general.nameInputIdSuffix}"]`)
    .or(page.getByPlaceholder(W.general.namePlaceholder))
    .fill(applicationName);
  await pickComboboxOption(
    page,
    page.getByRole('combobox', { name: W.general.argoServerComboboxLabel }),
    argoServerLabel
  );
  await clickNext(page);

  if (requeueTimeSeconds !== undefined) {
    await pickComboboxOption(
      page,
      page.getByRole('combobox', { name: W.general.requeueTimeComboboxLabel }),
      String(requeueTimeSeconds)
    );
  }
  await clickNext(page);

  if (!git) throw new Error('fillArgoAppsetWizardBeforePlacement: git repository spec is required');
  await page
    .locator('[data-ouia-component-type="PF6/Card"]')
    .filter({ hasText: W.template.gitRepositoryTypeCardText })
    .first()
    .click();
  await pickCreatableComboboxOption(
    page,
    page.getByRole('combobox', { name: W.template.gitUrlComboboxLabel }),
    git.url
  );
  if (git.branch) {
    await pickCreatableComboboxOption(
      page,
      page.getByRole('combobox', { name: W.template.gitRevisionComboboxLabel }),
      git.branch
    );
  } else {
    await pickFirstComboboxOption(
      page,
      page.getByRole('combobox', { name: W.template.gitRevisionComboboxLabel })
    );
  }
  if (git.path) {
    await pickGitPathOption(page, git.path);
  } else {
    await pickFirstComboboxOption(
      page,
      page.getByRole('combobox', { name: W.template.gitPathComboboxLabel })
    );
  }
  await page
    .locator(`[id$="${W.template.destinationInputIdSuffix}"]`)
    .or(page.getByPlaceholder(W.template.destinationNamespacePlaceholder))
    .fill(destinationNamespace);
  await clickNext(page);

  await clickNext(page);

  await expect(
    page.locator(`nav[aria-label="${W.navAccessibleName}"] button#${W.steps.placement}`)
  ).toHaveAttribute('aria-current', 'step', { timeout: 60_000 });
}
