import { expect, type Locator, type Page } from '@playwright/test';

import { APP_ARGO_CREATE_WIZARD_SHARED } from '@constants/app';
import {
  ARGO_APPSET_GENERATORS,
  type ArgoGeneratorDisplayName,
  type GeneratorConfigByName,
  type GitGeneratorConfig,
  type ListGeneratorConfig,
  type PluginGeneratorConfig,
  type PullRequestGeneratorConfig,
  type ScmProviderGeneratorConfig,
} from '@constants/argo-appset-generators';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPullApplicationCreateWizardPage } from '@pages/app/ArgoPullApplicationCreateWizardPage';
import { SyncEditorYamlActions } from '@lib/placement/sync-editor-actions';

const W = APP_ARGO_CREATE_WIZARD_SHARED;

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactOptionPattern(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
}

async function dismissOpenCombobox(page: Page): Promise<void> {
  await page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
}

async function pickRequeueTimeCombobox(page: Page, block: Locator, seconds: number): Promise<void> {
  const requeue = block.getByRole('combobox', { name: /Select the requeue time/i });
  await requeue.scrollIntoViewIfNeeded();
  await requeue.click();
  const option = page.getByRole('option', { name: String(seconds) }).first();
  if (await option.isVisible()) {
    await option.click();
  } else {
    await requeue.fill(String(seconds));
    await requeue.press('Enter');
  }
  await dismissOpenCombobox(page);
}

async function pickPfComboboxByTyping(page: Page, combobox: Locator, value: string): Promise<void> {
  const trimmed = value.trim();
  await combobox.scrollIntoViewIfNeeded();
  await combobox.click();
  await combobox.fill('');
  await combobox.pressSequentially(trimmed, { delay: 25 });

  const exactOption = page.getByRole('option', { name: exactOptionPattern(trimmed) }).first();
  const createOption = page.getByRole('option', { name: /Create new option/i }).first();
  const createBtn = page.getByRole('button', { name: /Create new option/i }).first();

  await expect
    .poll(
      async () => {
        if (await exactOption.isVisible()) return 'exact';
        if (await createOption.isVisible()) return 'create';
        if (await createBtn.isVisible()) return 'createBtn';
        return (await combobox.inputValue()).trim() === trimmed ? 'typed' : false;
      },
      { timeout: 60_000 }
    )
    .not.toBe(false);

  if (await exactOption.isVisible()) {
    await exactOption.click();
  } else if (await createOption.isVisible()) {
    await createOption.click();
  } else if (await createBtn.isVisible()) {
    await createBtn.click();
  } else {
    await combobox.press('Enter');
  }
  await dismissOpenCombobox(page);
}

/** Creatable PF combobox: type value, pick exact/create option, or commit with Enter. */
async function pickCreatableComboboxValue(
  page: Page,
  combobox: Locator,
  value: string
): Promise<void> {
  const trimmed = value.trim();
  await combobox.scrollIntoViewIfNeeded();
  await combobox.click();
  await combobox.fill('');
  await combobox.pressSequentially(trimmed, { delay: 25 });

  const exactOption = page.getByRole('option', { name: exactOptionPattern(trimmed) }).first();
  const createOption = page.getByRole('option', { name: /Create new option/i }).first();
  const createBtn = page.getByRole('button', { name: /Create new option/i }).first();

  await expect
    .poll(
      async () => {
        if (await exactOption.isVisible()) return 'exact';
        if (await createOption.isVisible()) return 'create';
        if (await createBtn.isVisible()) return 'createBtn';
        return (await combobox.inputValue()).trim() === trimmed ? 'typed' : false;
      },
      { timeout: 60_000, intervals: [200, 500, 1_000] }
    )
    .not.toBe(false);

  if (await exactOption.isVisible()) {
    await exactOption.click();
  } else if (await createOption.isVisible()) {
    await createOption.click();
  } else if (await createBtn.isVisible()) {
    await createBtn.click();
  } else {
    await combobox.press('Enter');
  }

  await expect(combobox).toHaveValue(trimmed, { timeout: 30_000 });
  await combobox.blur();
  await dismissOpenCombobox(page);
}

async function pickFirstComboboxOptionInLocator(page: Page, combobox: Locator): Promise<void> {
  await combobox.scrollIntoViewIfNeeded();
  await combobox.click();
  const option = page.getByRole('option').first();
  await option.waitFor({ state: 'visible', timeout: 60_000 });
  await option.click();
}

function generatorsPanel(page: Page): Locator {
  return page.locator('div#generators').first();
}

function getGeneratorHeadings(page: Page): Locator {
  return generatorsPanel(page)
    .getByRole('heading', { level: 6 })
    .filter({ hasText: /generator/i });
}

function getGeneratorBlockBySlot(page: Page, slotIndex: number): Locator {
  const heading = getGeneratorHeadings(page).nth(slotIndex);
  // Nearest ancestor that contains a remove control, then its parent (full generator block).
  return heading.locator('xpath=ancestor::*[.//button[@aria-label="Remove item"]][1]/..');
}

function getGeneratorRemoveButton(page: Page, slotIndex: number): Locator {
  const heading = getGeneratorHeadings(page).nth(slotIndex);
  // PF6 wraps the h6; remove is in the same header row, not a direct following-sibling.
  return heading.locator(
    'xpath=ancestor::*[.//button[@aria-label="Remove item"]][1]//button[@aria-label="Remove item"][1]'
  );
}

function normalizeGeneratorName(name: string): string {
  return name.trim().toLowerCase();
}

export async function getCurrentArgoGeneratorNames(page: Page): Promise<string[]> {
  const headings = getGeneratorHeadings(page);
  const count = await headings.count();
  const names: string[] = [];
  for (let i = 0; i < count; i += 1) {
    names.push((await headings.nth(i).textContent())?.trim() ?? '');
  }
  return names;
}

export async function removeArgoGeneratorAt(page: Page, index: number): Promise<void> {
  const before = await getGeneratorHeadings(page).count();
  const removeBtn = getGeneratorRemoveButton(page, index - 1);
  await removeBtn.scrollIntoViewIfNeeded();
  await removeBtn.click({ force: true });
  await expect(getGeneratorHeadings(page)).toHaveCount(Math.max(0, before - 1), {
    timeout: 15_000,
  });
}

export async function addArgoGenerator(
  page: Page,
  menuItemText: ArgoGeneratorDisplayName
): Promise<void> {
  const addButton = page.getByRole('button', {
    name: ARGO_APPSET_GENERATORS.addGeneratorButtonLabel,
  });
  await addButton.first().scrollIntoViewIfNeeded();
  await addButton.first().click({ force: true });
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible({ timeout: 10_000 });
  await menu.getByRole('menuitem', { name: menuItemText }).click({ force: true });
}

async function fillGitGeneratorData(
  page: Page,
  data: GitGeneratorConfig,
  generatorSlotIndex: number
): Promise<void> {
  const block = getGeneratorBlockBySlot(page, generatorSlotIndex);
  if (data.repoURL) {
    const input = block
      .getByRole('combobox', { name: /Enter or select a Git URL/i })
      .or(block.locator('input[aria-label="Enter or select a Git URL"]'));
    await pickPfComboboxByTyping(page, input, data.repoURL);
  }
  if (data.revision) {
    const input = block
      .getByRole('combobox', { name: /tracking revision/i })
      .or(block.locator('input[aria-label="Enter or select a tracking revision"]'));
    await pickCreatableComboboxValue(page, input, data.revision);
  }
  if (data.directories?.length) {
    const path = data.directories[0]!;
    const input = block
      .getByRole('combobox', { name: /directory path|repository path/i })
      .or(block.locator('input[aria-label="Select or enter a directory path"]'))
      .or(block.locator('input[aria-label="Enter or select a repository path"]'));
    await pickCreatableComboboxValue(page, input, path);
    const syncEditor = new SyncEditorYamlActions(page, '__argoPullWizardYamlCopy');
    await syncEditor.waitForYamlMatching(
      new RegExp(`directories:\\s*\\n\\s+- path:\\s*${escapeRegex(path)}`),
      30_000
    );
  }
  if (data.requeueAfterSeconds != null) {
    const input = block.locator('input[aria-label="Select the requeue time"]');
    await input.scrollIntoViewIfNeeded();
    await input.fill(String(data.requeueAfterSeconds));
    await input.blur();
  }
}

async function fillListGeneratorData(
  page: Page,
  data: ListGeneratorConfig,
  generatorSlotIndex: number
): Promise<void> {
  const elements = data.elements ?? [];
  if (!elements.length) return;
  const block = getGeneratorBlockBySlot(page, generatorSlotIndex);
  const container = block.locator('#list\\.elements').or(block.locator('[id$=".list.elements"]'));
  await container.first().scrollIntoViewIfNeeded();
  const addElementButton = block.locator('button').filter({ hasText: 'Add element' });

  for (let i = 0; i < elements.length; i += 1) {
    const row = block.locator(`[id$=".list.elements.${i}"]`);
    if ((await row.count()) === 0) {
      await addElementButton.click();
      await row.waitFor({ state: 'visible', timeout: 10_000 });
    }
    const clusterInput = row.locator('input[placeholder="Enter the cluster name"]');
    const urlInput = row.locator('input[placeholder="Enter the cluster URL"]');
    await row.scrollIntoViewIfNeeded();
    await clusterInput.fill(elements[i]!.cluster);
    await clusterInput.blur();
    await urlInput.fill(elements[i]!.url);
    await urlInput.blur();
  }
  await dismissOpenCombobox(page);

  const firstCluster = escapeRegex(elements[0]!.cluster);
  const syncEditor = new SyncEditorYamlActions(page, '__argoPullWizardYamlCopy');
  await syncEditor.waitForYamlMatching(
    new RegExp(
      `elements:\\s*\\n\\s+- cluster:\\s*${firstCluster}|elements:\\s*\\n\\s+-\\s*\\n\\s+cluster:\\s*${firstCluster}`
    ),
    30_000
  );
}

async function fillPluginGeneratorData(
  page: Page,
  data: PluginGeneratorConfig,
  generatorSlotIndex: number
): Promise<void> {
  const block = getGeneratorBlockBySlot(page, generatorSlotIndex);
  if (data.configMapRefName != null) {
    await block
      .locator('input[placeholder="Enter the ConfigMap name"]')
      .fill(data.configMapRefName);
  }
  const inputParams = data.inputParameters ?? {};
  const paramEntries = Object.entries(inputParams);
  if (paramEntries.length) {
    const container = block.locator('[id$=".plugin.input.parameters"]');
    const keyCount = await container.locator('input[id^="key-"]').count();
    const addInputParameter = block.locator('button').filter({ hasText: 'Add input parameter' });
    for (let i = 0; i < paramEntries.length - keyCount; i += 1) {
      await addInputParameter.click();
    }
    for (let i = 0; i < paramEntries.length; i += 1) {
      const [key, value] = paramEntries[i]!;
      await container.locator('input[id^="key-"]').nth(i).fill(key);
      await container.locator('input[id^="value-"]').nth(i).fill(String(value));
    }
  }
  const valueEntries = Object.entries(data.values ?? {});
  if (valueEntries.length) {
    const container = block.locator('[id$=".plugin.values"]');
    const keyCount = await container.locator('input[id^="key-"]').count();
    const addValue = block.locator('button').filter({ hasText: 'Add value' });
    for (let i = 0; i < valueEntries.length - keyCount; i += 1) {
      await addValue.click();
    }
    for (let i = 0; i < valueEntries.length; i += 1) {
      const [key, value] = valueEntries[i]!;
      await container.locator('input[id^="key-"]').nth(i).fill(key);
      await container.locator('input[id^="value-"]').nth(i).fill(String(value));
    }
  }
  if (data.requeueAfterSeconds != null) {
    await pickRequeueTimeCombobox(page, block, data.requeueAfterSeconds);
  }
}

async function fillPullRequestGeneratorData(
  page: Page,
  data: PullRequestGeneratorConfig,
  generatorSlotIndex: number
): Promise<void> {
  const block = getGeneratorBlockBySlot(page, generatorSlotIndex);
  if (data.owner != null) {
    await block.locator('input[placeholder="Enter the GitHub owner"]').fill(data.owner);
  }
  if (data.repo != null) {
    await block.locator('input[placeholder="Enter the repository name"]').fill(data.repo);
  }
  if (data.api != null) {
    await block.locator('input[placeholder="Enter the GitHub API URL"]').fill(data.api);
  }
  if (data.tokenSecretName != null) {
    await block
      .locator('input[placeholder="Enter the token secret name"]')
      .fill(data.tokenSecretName);
  }
  if (data.tokenKey != null) {
    await block.locator('input[placeholder="Enter the token key"]').fill(data.tokenKey);
  }
  if (data.appSecretName != null) {
    await block.locator('input[placeholder="Enter the app secret name"]').fill(data.appSecretName);
  }
  if (data.labels?.length) {
    const label = data.labels[0]!;
    const labelsInput = block.locator('input[aria-label="Enter labels"]');
    await labelsInput.fill(label);
    const createOption = page.getByRole('option', { name: /Create new option/i }).first();
    if (await createOption.isVisible()) {
      await createOption.click();
    } else {
      const createBtn = page.getByRole('button', { name: /Create new option/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
      } else {
        await labelsInput.press('Enter');
      }
    }
    await dismissOpenCombobox(page);
  }
  if (data.requeueAfterSeconds != null) {
    await pickRequeueTimeCombobox(page, block, data.requeueAfterSeconds);
  }
}

async function fillScmProviderGeneratorData(
  page: Page,
  data: ScmProviderGeneratorConfig,
  generatorSlotIndex: number
): Promise<void> {
  const block = getGeneratorBlockBySlot(page, generatorSlotIndex);
  if (data.organization != null) {
    await block
      .locator('input[placeholder="Enter the GitHub organization"]')
      .fill(data.organization);
  }
  if (data.api != null) {
    await block.locator('input[placeholder="Enter the GitHub API URL"]').fill(data.api);
  }
  if (data.allBranches != null) {
    const checkbox = block.getByRole('checkbox');
    const checked = await checkbox.isChecked();
    if (data.allBranches !== checked) await checkbox.click();
  }
  if (data.tokenSecretName != null) {
    await block
      .locator('input[placeholder="Enter the token secret name"]')
      .fill(data.tokenSecretName);
  }
  if (data.tokenKey != null) {
    await block.locator('input[placeholder="Enter the token key"]').fill(data.tokenKey);
  }
  if (data.appSecretName != null) {
    await block.locator('input[placeholder="Enter the app secret name"]').fill(data.appSecretName);
  }
}

async function addClustersGeneratorMatchLabel(
  page: Page,
  key: string,
  value: string,
  generatorSlotIndex: number
): Promise<void> {
  const block = getGeneratorBlockBySlot(page, generatorSlotIndex);
  const keyInputs = block.locator('input[id^="key-"]');
  const keyCount = await keyInputs.count();
  for (let i = 0; i < keyCount; i += 1) {
    if ((await keyInputs.nth(i).inputValue()) === key) {
      await block.locator('input[id^="value-"]').nth(i).fill(value);
      return;
    }
  }
  await block.locator('button').filter({ hasText: 'Add label' }).click();
  await block.locator('input[id^="key-"]').last().fill(key);
  await block.locator('input[id^="value-"]').last().fill(value);
}

export async function fillArgoGeneratorConfig(
  page: Page,
  generatorName: ArgoGeneratorDisplayName,
  data?: GeneratorConfigByName[ArgoGeneratorDisplayName],
  generatorSlotIndex = 0
): Promise<void> {
  if (generatorName === 'Cluster Decision Resource generator') {
    await getGeneratorBlockBySlot(page, generatorSlotIndex)
      .locator('[id$="clusterdecisionresource-requeueafterseconds"]')
      .or(
        getGeneratorBlockBySlot(page, generatorSlotIndex).getByRole('combobox', {
          name: ARGO_APPSET_GENERATORS.clusterDecisionRequeueComboboxLabel,
        })
      )
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });
    return;
  }
  if (generatorName === 'Clusters generator' && data && 'matchLabels' in data) {
    for (const { key, value } of data.matchLabels ?? []) {
      await addClustersGeneratorMatchLabel(page, key, value, generatorSlotIndex);
    }
  }
  if (generatorName === 'Git generator' && data) {
    await fillGitGeneratorData(page, data as GitGeneratorConfig, generatorSlotIndex);
  }
  if (generatorName === 'List generator' && data) {
    await fillListGeneratorData(page, data as ListGeneratorConfig, generatorSlotIndex);
  }
  if (generatorName === 'Plugin generator' && data) {
    await fillPluginGeneratorData(page, data as PluginGeneratorConfig, generatorSlotIndex);
  }
  if (generatorName === 'Pull Request generator' && data) {
    await fillPullRequestGeneratorData(
      page,
      data as PullRequestGeneratorConfig,
      generatorSlotIndex
    );
  }
  if (generatorName === 'SCM Provider generator' && data) {
    await fillScmProviderGeneratorData(
      page,
      data as ScmProviderGeneratorConfig,
      generatorSlotIndex
    );
  }
}

export async function ensureFirstArgoGeneratorThenSelectAndFill(
  page: Page,
  displayNames: ArgoGeneratorDisplayName[],
  generatorConfigByDisplayName?: GeneratorConfigByName
): Promise<void> {
  if (!displayNames.length) return;
  const getData = (name: ArgoGeneratorDisplayName) => generatorConfigByDisplayName?.[name];
  const wantFirst = displayNames[0]!;
  const wantSecond = displayNames[1];

  let current = await getCurrentArgoGeneratorNames(page);
  const firstMatches =
    current[0] != null && normalizeGeneratorName(current[0]) === normalizeGeneratorName(wantFirst);

  if (!firstMatches) {
    while (current.length > 0) {
      await removeArgoGeneratorAt(page, 1);
      current = await getCurrentArgoGeneratorNames(page);
    }
    await addArgoGenerator(page, wantFirst);
  }
  await fillArgoGeneratorConfig(page, wantFirst, getData(wantFirst), 0);

  if (wantSecond) {
    current = await getCurrentArgoGeneratorNames(page);
    const secondMatches =
      current[1] != null &&
      normalizeGeneratorName(current[1]) === normalizeGeneratorName(wantSecond);
    if (!secondMatches) {
      if (current.length >= 2) {
        await removeArgoGeneratorAt(page, 2);
      }
      await addArgoGenerator(page, wantSecond);
    }
    await fillArgoGeneratorConfig(page, wantSecond, getData(wantSecond), 1);
    return;
  }

  while ((await getCurrentArgoGeneratorNames(page)).length > 1) {
    await removeArgoGeneratorAt(page, 2);
  }
}

async function clickWizardNavStep(page: Page, stepId: string): Promise<void> {
  const nav = page.locator(`nav[aria-label="${W.navAccessibleName}"]`);
  await nav.locator(`button#${stepId}`).click();
  await expect(nav.locator(`button#${stepId}`)).toHaveAttribute('aria-current', 'step', {
    timeout: 30_000,
  });
  const panel = page.locator(`div#${stepId}, section#${stepId}`).first();
  await panel.waitFor({ state: 'visible', timeout: 30_000 });
}

async function selectGitRepositoryTypeOnPullTemplate(page: Page): Promise<void> {
  const gitTile = page
    .locator('[id^="wiz-tile-"]')
    .filter({ has: page.getByText(W.template.gitRepositoryTypeCardText, { exact: true }) })
    .first();
  if (await gitTile.isVisible()) {
    await gitTile.click({ force: true });
    return;
  }
  await page
    .locator('[data-ouia-component-type="PF6/Card"]')
    .filter({ hasText: W.template.gitRepositoryTypeCardText })
    .first()
    .click();
}

async function fillArgoTemplateStep(page: Page): Promise<void> {
  const { repoUrl, destinationNamespace } = ARGO_APPSET_GENERATORS;
  await selectGitRepositoryTypeOnPullTemplate(page);
  await pickCreatableComboboxValue(
    page,
    page.getByRole('combobox', { name: W.template.gitUrlComboboxLabel }),
    repoUrl
  );
  await pickFirstComboboxOptionInLocator(
    page,
    page.getByRole('combobox', { name: W.template.gitRevisionComboboxLabel })
  );
  await pickFirstComboboxOptionInLocator(
    page,
    page.getByRole('combobox', { name: W.template.gitPathComboboxLabel })
  );
  await page
    .locator(`[id$="${W.template.destinationInputIdSuffix}"]`)
    .or(page.getByPlaceholder(W.template.destinationNamespacePlaceholder))
    .fill(destinationNamespace);
}

/** From Applications list → pull wizard → Generators step (Cypress `openArgoWizardToGeneratorsStep`). */
export async function openArgoPullWizardToGeneratorsStep(
  applicationListPage: ApplicationListPage,
  page: Page,
  pullWizard: ArgoPullApplicationCreateWizardPage
): Promise<void> {
  await applicationListPage.goto();
  await pullWizard.openFromApplicationsList(applicationListPage);

  const { applicationName, argoServerLabel } = ARGO_APPSET_GENERATORS;
  await page
    .locator(`[id$="${W.general.nameInputIdSuffix}"]`)
    .or(page.getByPlaceholder(W.general.namePlaceholder))
    .fill(applicationName);
  await pickComboboxOption(
    page,
    page.getByRole('combobox', { name: W.general.argoServerComboboxLabel }),
    argoServerLabel
  );

  await clickWizardNavStep(page, W.steps.template);
  await fillArgoTemplateStep(page);
  await clickWizardNavStep(page, W.steps.generators);
  await generatorsPanel(page)
    .getByRole('button', { name: ARGO_APPSET_GENERATORS.addGeneratorButtonLabel })
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 });
}

export async function assertPlacementTabPresent(page: Page): Promise<void> {
  await expect(
    page.locator(`nav[aria-label="${W.navAccessibleName}"] button#${W.steps.placement}`)
  ).toBeVisible({ timeout: 10_000 });
}

export async function assertPlacementTabAbsent(page: Page): Promise<void> {
  await expect(
    page.locator(`nav[aria-label="${W.navAccessibleName}"] button#${W.steps.placement}`)
  ).toHaveCount(0);
}

export async function exitArgoPullWizardToApplicationsPage(
  pullWizard: ArgoPullApplicationCreateWizardPage,
  page: Page
): Promise<void> {
  await page.getByRole('button', { name: W.footer.cancel, exact: true }).click({ force: true });
  await expect(page.locator('#general')).toBeHidden({ timeout: 30_000 });
}

export async function readArgoPullWizardYaml(
  pullWizard: ArgoPullApplicationCreateWizardPage,
  options?: { expectMatrix?: boolean }
): Promise<string> {
  const read = () =>
    pullWizard.syncEditor.readYaml({
      waitPattern: /kind:\s*ApplicationSet/,
      timeoutMs: 60_000,
    });

  if (options?.expectMatrix) {
    let yaml = '';
    await expect
      .poll(
        async () => {
          yaml = await read();
          return /^\s*-\s*matrix:/m.test(yaml) || /\n\s+matrix:\n/.test(yaml);
        },
        { timeout: 60_000, intervals: [500, 1_000, 2_000] }
      )
      .toBe(true);
    expect(yaml).toContain('apiVersion');
    return yaml;
  }

  const yaml = await read();
  expect(yaml).toContain('apiVersion');
  return yaml;
}
