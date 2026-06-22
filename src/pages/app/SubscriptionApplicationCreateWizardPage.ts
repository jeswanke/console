import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
  APP_APPLICATION_DETAILS,
  APP_ROUTES,
  APP_SUBSCRIPTION_CREATE_WIZARD,
  APP_CREATE_MENU,
  getSubscriptionWizardHelpPopoverText,
  subscriptionAutomationAnsibleSecretNameLabelId,
  subscriptionAutomationPrePostSectionToggleId,
  subscriptionWizardChannelRepositoryTypesSectionToggleId,
  subscriptionWizardClusterDeploymentSectionToggleId,
  subscriptionWizardClusterSelectorCheckboxId,
  subscriptionWizardClusterSelectorLabelDomIds,
  subscriptionWizardGitTestId,
  subscriptionWizardHelmTestId,
  subscriptionWizardObjectStorageTestId,
  subscriptionWizardPlacementTestId,
  subscriptionTimeWindowDayCheckboxId,
  subscriptionTimeWindowModeRadioIds,
  subscriptionTimeWindowRangeInputIds,
  type AppSubscriptionTimeWindowWeekday,
  type SubscriptionWizardRepositoryCardKind,
} from '@constants/app';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import { pageUrlPathnameEquals } from '@lib/navigation';

/**
 * Subscription application **create** wizard (Application Lifecycle).
 *
 * **Route:** `/multicloud/applications/create/subscription`
 *
 * **Entry:** Applications list → {@link APP_CREATE_MENU} → Subscription.
 *
 * This page object mirrors {@link ApplicationListPage}: one getter per interactive
 * or assertable region (no assertions here — use tests). Constants live in
 * {@link APP_SUBSCRIPTION_CREATE_WIZARD}.
 *
 * Locators use **`data-testid`** via {@link subscriptionWizardGitTestId} / {@link subscriptionWizardHelmTestId}
 * / {@link subscriptionWizardPlacementTestId} (and role-based accessors where the console has no hook).
 *
 * **Multiple repositories:** click {@link getAddAnotherRepositoryButton}, then use
 * `getRepositoryBlockContainer` / `getGit*InRepositoryBlock` / `getHelm*InRepositoryBlock` /
 * `getObjectStore*InRepositoryBlock` — `data-testid` values gain a `grp1`, `grp2`, … suffix
 * (see {@link subscriptionWizardGitTestId} / {@link subscriptionRepositoryDataTestId}).
 * **Repository type tiles** (`card-github`, …) are **duplicated per block** — use {@link getRepositoryGitCardInBlock}
 * / {@link getRepositoryHelmCardInBlock} / {@link getRepositoryObjectStorageCardInBlock}, not unscoped `getByTestId`.
 * Prefer {@link selectRepositoryTypeInBlock} to **ensure** a type is selected without redundant clicks on an already-selected tile.
 * **YAML: On** shows the Monaco panel and can hide form controls from layout — turn YAML off to exercise
 * `data-testid` fields. **Repository types** / **cluster placement** accordions may need expanding before Git
 * fields and placement comboboxes appear (verified on `qe6-vmware-ibm` subscription create).
 *
 * **Placement rule deprecation:** {@link getPlacementRuleDeprecationAlert} — assert title/body and documentation `href`
 * (`APP_DOCS_ACM_DEPRECATIONS_RELEASE_NOTES_HREF_RE` in **`app.ts`**).
 */
export class SubscriptionApplicationCreateWizardPage extends BasePage {
  constructor(
    page: Page,
    /** Used by {@link createSubscription} for `oc` preflight (existing Application CR). */
    public readonly oc: OcCliService
  ) {
    super(page);
  }

  private byId(elementId: string): Locator {
    return this.page.locator(`#${elementId}`);
  }

  private byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Template editor accordion titles use a `collapsed` class when the section is closed.
   * Clicks only when collapsed — avoids collapsing an already-open section (which breaks tests).
   */
  private async expandAccordionSectionIfCollapsed(sectionToggle: Locator): Promise<void> {
    const needsExpand = await sectionToggle.evaluate((el) =>
      (el as HTMLElement).classList.contains('collapsed')
    );
    if (!needsExpand) return;
    await sectionToggle.click();
    await this.waitForLoad();
  }

  /**
   * PatternFly typeahead combobox (Git/Helm/Object **URL**, branch, path, etc.).
   * On edit, channel values may load with an empty `inputValue` and only a `placeholder`; plain `fill()` can
   * leave the control invalid. Click, set the value when it differs, and **Enter** to commit React state.
   */
  async fillTypeaheadCombobox(comboboxLocator: Locator, value: string): Promise<void> {
    const trimmed = value.trim();
    await comboboxLocator.waitFor({ state: 'visible', timeout: 30_000 });
    await comboboxLocator.click();
    if ((await comboboxLocator.inputValue()).trim() !== trimmed) {
      await comboboxLocator.fill(trimmed);
      await comboboxLocator.press('Enter');
    }
    await expect(comboboxLocator).toHaveValue(trimmed, { timeout: 30_000 });
  }

  /** Git control in repository block `blockIndex` (`0` = first) — suffixed `data-testid` (e.g. `githubURLgrp1`). */
  private gitFieldInRepositoryBlock(
    testIdKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.git,
    blockIndex: number
  ): Locator {
    return this.byTestId(subscriptionWizardGitTestId(testIdKey, blockIndex));
  }

  /** Helm control in repository block `blockIndex` (e.g. `helmURLgrp1`). */
  private helmFieldInRepositoryBlock(
    testIdKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.helm,
    blockIndex: number
  ): Locator {
    return this.byTestId(subscriptionWizardHelmTestId(testIdKey, blockIndex));
  }

  /** Object storage control in repository block `blockIndex` (e.g. `objectstoreURLgrp1`). */
  private objectStorageFieldInRepositoryBlock(
    testIdKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.objectStorage,
    blockIndex: number
  ): Locator {
    return this.byTestId(subscriptionWizardObjectStorageTestId(testIdKey, blockIndex));
  }

  /** Cluster selector **Label** / **Operator** / **Value** comboboxes (shared accessible-name pattern). */
  private clusterPlacementLabelCombobox(
    kind: 'labelName' | 'labelOperator' | 'labelValue'
  ): Locator {
    const n = APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementAccessibleNames[kind];
    return this.page.getByRole('combobox', { name: n });
  }

  private clusterPlacementLabelComboboxForRow(
    kind: 'labelName' | 'labelOperator' | 'labelValue',
    rowIndex: number
  ): Locator {
    return this.clusterPlacementLabelCombobox(kind).nth(rowIndex);
  }

  /**
   * **More info** popover trigger beside a labelled control (`{fieldId}-label-help-button`).
   * Expected English popover bodies are recorded in **`app.ts`** as
   * `APP_SUBSCRIPTION_CREATE_WIZARD_HELP_POPOVER_TEXT` (see `getSubscriptionWizardHelpPopoverText`).
   */
  getLabelHelpButton(fieldControlId: string): Locator {
    return this.byId(`${fieldControlId}-label-help-button`);
  }

  /**
   * Expected **English** popover body for `getLabelHelpButton(fieldControlId)` after clicking it
   * (e.g. assert `.pf-v5-c-popover__body` contains this text).
   */
  getHelpPopoverExpectedTextForField(
    fieldControlId: string,
    options?: { repositoryCard?: SubscriptionWizardRepositoryCardKind }
  ): string | undefined {
    return getSubscriptionWizardHelpPopoverText(`${fieldControlId}-label-help-button`, options);
  }

  /**
   * Same as {@link getSubscriptionWizardHelpPopoverText} — pass the full help button id
   * (e.g. `eman-label-help-button`, `connection-label-help-button`).
   * Use **`repositoryCard`** for `#undefined-label-help-button`.
   */
  getHelpPopoverExpectedTextByHelpButtonId(
    helpButtonId: string,
    options?: { repositoryCard?: SubscriptionWizardRepositoryCardKind }
  ): string | undefined {
    return getSubscriptionWizardHelpPopoverText(helpButtonId, options);
  }

  /** Deep-link into the wizard (same view as after choosing Subscription from the menu). */
  async goto(): Promise<void> {
    if (pageUrlPathnameEquals(this.page, APP_SUBSCRIPTION_CREATE_WIZARD.routePath)) {
      await this.waitForLoad();
      return;
    }
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${APP_SUBSCRIPTION_CREATE_WIZARD.routePath}`);
    await this.waitForLoad();
  }

  /**
   * Opens an existing subscription application on the **Details** tab (same route as after **Create**).
   * Used when `createSubscription` skips the wizard because the Application CR already exists.
   */
  async gotoApplicationDetailsTab(namespace: string, applicationName: string): Promise<void> {
    const detailsPath = APP_ROUTES.detailsTab(
      namespace,
      applicationName,
      APP_APPLICATION_DETAILS.tabs.details.slug
    );
    if (pageUrlPathnameEquals(this.page, detailsPath)) {
      await this.waitForLoad();
      return;
    }
    await this.page.goto(new URL(detailsPath, this.page.url()).toString());
    await this.waitForLoad();
  }

  /**
   * Open the wizard from the Applications list (toolbar Create application → Subscription).
   * Requires the same `page` as `listPage`.
   */
  async openFromApplicationsList(listPage: ApplicationListPage): Promise<void> {
    await listPage.goto();
    await listPage.openCreateApplication();
    await this.byId(APP_CREATE_MENU.optionIds.subscription).click();
    await this.waitForLoad();
    await this.getApplicationNameInput().waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * Open existing subscription app editor from Applications list row actions.
   * Flow: list search by name → row kebab → **Edit application**.
   */
  async openEditFromApplicationsList(
    listPage: ApplicationListPage,
    applicationName: string
  ): Promise<void> {
    await listPage.openEditSubscriptionApplicationFromOverviewViaSearch(applicationName);
    await this.waitForLoad();
    await this.getYamlToggle().waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * Open subscription edit from an application's **Details** page actions menu.
   * Navigates to Details first to avoid depending on caller's current tab.
   */
  async openEditFromApplicationDetails(namespace: string, applicationName: string): Promise<void> {
    await this.gotoApplicationDetailsTab(namespace, applicationName);
    await this.page.getByRole('button', { name: 'Actions', exact: true }).click();
    await this.page.getByRole('menuitem', { name: /^Edit application$/i }).click();
    await this.waitForLoad();
    await this.getYamlToggle().waitFor({ state: 'visible', timeout: 60_000 });
  }

  /** Assert current URL using Playwright `toHaveURL` semantics. */
  async expectUrl(url: string | RegExp, options?: { timeout?: number }): Promise<void> {
    await expect(this.page).toHaveURL(url, options);
  }

  /** Assert `/multicloud/applications/edit/subscription/{ns}/{name}` URL. */
  async expectOnEditSubscriptionUrl(
    namespace: string,
    applicationName: string,
    options?: { timeout?: number }
  ): Promise<void> {
    const escapedNs = namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = applicationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.expectUrl(
      new RegExp(`/multicloud/applications/edit/subscription/${escapedNs}/${escapedName}(\\?|$)`),
      options
    );
  }

  /** Assert Applications list URL (`/multicloud/applications`). */
  async expectOnApplicationsListUrl(options?: { timeout?: number }): Promise<void> {
    await this.expectUrl(/\/multicloud\/applications(\?|$)/, options);
  }

  /** Assert `/multicloud/applications/details/{ns}/{name}/details` URL. */
  async expectOnApplicationDetailsTabUrl(
    namespace: string,
    applicationName: string,
    options?: { timeout?: number }
  ): Promise<void> {
    const escapedNs = namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = applicationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.expectUrl(
      new RegExp(`/multicloud/applications/details/${escapedNs}/${escapedName}/details(\\?|$)`),
      options
    );
  }

  // ---------------------------------------------------------------------------
  // Shell: title & save
  // ---------------------------------------------------------------------------

  /** Wizard / page title (PF heading). */
  getTitleHeading(): Locator {
    return this.page.getByRole('heading', { level: APP_SUBSCRIPTION_CREATE_WIZARD.title.roleLevel });
  }

  /** Breadcrumb link back to Applications list */
  getBreadcrumbApplicationsLink(): Locator {
    return this.page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', {
      name: 'Applications',
    });
  }

  /**
   * Discard wizard changes (toolbar).
   * **Note:** some hubs render duplicate `#id`s — **`.first()`** keeps strict mode happy.
   */
  getCancelButton(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.shell.cancelButtonId).first();
  }

  /** Portal mount for the **Update** control on edit flows (may be empty on create). */
  getEditButtonPortal(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.shell.editButtonPortalId);
  }

  /** Primary Create — `data-testid` from {@link APP_SUBSCRIPTION_CREATE_WIZARD.testIds.actions.create}. */
  getCreateButton(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.actions.create);
  }

  /**
   * Same control as {@link getCreateButton} — the actual `<button>` **`#id`** (portal renders
   * {@link APP_SUBSCRIPTION_CREATE_WIZARD.submit.createButtonElementId} with `data-testid` = create).
   */
  getCreateButtonElement(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.submit.createButtonElementId);
  }

  /**
   * Primary submit action in wizard chrome.
   * Target the actual submit `<button>` first (`create-button-portal-id-btn`) and fall back
   * to the visible role/name control (`Update`/`Create`) when needed.
   */
  getPrimarySubmitButton(): Locator {
    return this.getCreateButtonElement()
      .or(this.page.getByRole('button', { name: /^(Update|Create)$/i }))
      .first();
  }

  /** Visibility anchor before submit (same as {@link getCreateButton}). */
  getCreateButtonPortalAnchor(): Locator {
    return this.getCreateButton();
  }

  getNotificationsRegion(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.notificationsRegionId);
  }

  /** Toggle form vs YAML editor (`#edit-yaml` — checkbox in current hub). */
  getYamlToggle(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.yamlToggleId);
  }

  /** Visible switch label for {@link getYamlToggle} — use for clicks (see {@link yamlClickToggle}). */
  getYamlToggleLabel(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.yamlToggleLabelId);
  }

  /**
   * Clicks the YAML form/YAML switch. Uses `#edit-yaml-label` first; falls back to `force` on the input
   * if needed (PatternFly switch layering).
   */
  async yamlClickToggle(): Promise<void> {
    await this.getYamlToggleLabel()
      .click()
      .catch(async () => {
        await this.getYamlToggle().click({ force: true });
      });
  }

  /**
   * Wrapper for the YAML editor region when YAML mode is on.
   * Prefer {@link expandYamlEditor} before interacting with Monaco.
   */
  getYamlCreationView(): Locator {
    return this.page.locator(APP_SUBSCRIPTION_CREATE_WIZARD.yamlEditor.creationViewSelector);
  }

  /** Inner container around the editor chrome (may wrap Monaco). */
  getYamlEditorContainer(): Locator {
    return this.page.locator(APP_SUBSCRIPTION_CREATE_WIZARD.yamlEditor.editorContainerSelector);
  }

  /**
   * Monaco keyboard target (`textarea.inputarea`). Use {@link readYamlEditorText} / {@link setYamlEditorText}
   * unless you need low-level focus.
   */
  getYamlMonacoTextarea(): Locator {
    const y = APP_SUBSCRIPTION_CREATE_WIZARD.yamlEditor;
    return this.getYamlCreationView()
      .locator(y.monacoTextareaSelector)
      .or(this.getYamlCreationView().locator('.monaco-editor textarea'))
      .first();
  }

  /** `true` when the YAML creation panel is visible (YAML mode on). */
  async isYamlEditorExpanded(): Promise<boolean> {
    return this.getYamlCreationView().isVisible();
  }

  /** Turn YAML mode **on** — shows `.creation-view-yaml` and Monaco. No-op if already expanded. */
  async expandYamlEditor(): Promise<void> {
    if (await this.isYamlEditorExpanded()) return;
    await this.yamlClickToggle();
    await this.getYamlCreationView().waitFor({ state: 'visible', timeout: 60_000 });
    await this.getYamlMonacoTextarea().waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForLoad();
  }

  /** Turn YAML mode **off** — hides the YAML panel / returns toward form view. No-op if already collapsed. */
  async collapseYamlEditor(): Promise<void> {
    if (!(await this.isYamlEditorExpanded())) return;
    await this.yamlClickToggle();
    await this.getYamlCreationView().waitFor({ state: 'hidden', timeout: 60_000 });
    await this.waitForLoad();
  }

  /**
   * Read the current YAML document from Monaco (`inputValue` on the inputarea).
   * Expands the YAML panel first if needed.
   * Note: collapsing YAML and re-expanding may **regenerate** YAML from the form; unsaved Monaco-only edits can be lost.
   */
  async readYamlEditorText(): Promise<string> {
    await this.expandYamlEditor();
    const ta = this.getYamlMonacoTextarea();
    await ta.waitFor({ state: 'attached', timeout: 30_000 });
    return ta.inputValue();
  }

  /**
   * Replace YAML editor content (same as pasting into Monaco — uses `fill` on the keyboard textarea).
   * Expands the YAML panel first if needed.
   * Note: see {@link readYamlEditorText} — toggling YAML off/on may resync from the form.
   */
  async setYamlEditorText(yaml: string): Promise<void> {
    await this.expandYamlEditor();
    const ta = this.getYamlMonacoTextarea();
    await ta.waitFor({ state: 'visible', timeout: 30_000 });
    await ta.click();
    await ta.fill(yaml);
  }

  // ---------------------------------------------------------------------------
  // General — application name & namespace
  // ---------------------------------------------------------------------------

  getApplicationNameInput(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.general.applicationNameText);
  }

  /** Namespace **combobox** filter input — {@link APP_SUBSCRIPTION_CREATE_WIZARD.testIds.general.namespaceCombo}. */
  getNamespaceInput(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.general.namespaceCombo);
  }

  async fillApplicationName(name: string): Promise<void> {
    await this.getApplicationNameInput().fill(name);
  }

  /** Type namespace and commit selection (Enter) when the combobox accepts it. */
  async selectNamespace(namespace: string): Promise<void> {
    const nsInput = this.getNamespaceInput();
    await nsInput.fill(namespace);
    await nsInput.press('Enter').catch(() => undefined);
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Repository sections (accordion toggles)
  // ---------------------------------------------------------------------------

  getRepositoryLocationSectionToggle(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.sectionToggles.repositoryLocation);
  }

  /**
   * Expand **Repository location for resources** if collapsed (same accordion `collapsed` class behavior as
   * {@link expandRepositoryTypesSectionForRepositoryBlock}).
   */
  async expandRepositoryLocationSection(): Promise<void> {
    await this.expandAccordionSectionIfCollapsed(this.getRepositoryLocationSectionToggle());
  }

  getRepositoryTypesSectionToggle(): Locator {
    return this.getRepositoryTypesSectionToggleForRepositoryBlock(0);
  }

  /**
   * **Repository types** accordion for subscription block `blockIndex` (`#channel-repository-types` or
   * `#channelgrp{N}-repository-types` — see {@link subscriptionWizardChannelRepositoryTypesSectionToggleId}).
   */
  getRepositoryTypesSectionToggleForRepositoryBlock(blockIndex: number): Locator {
    return this.byId(subscriptionWizardChannelRepositoryTypesSectionToggleId(blockIndex));
  }

  /**
   * Expand **Repository types** for `blockIndex` so channel tiles / Git URL (`githubURL`, etc.) are available.
   * Idempotent — skips the click if the section is already open (`collapsed` class on the title toggle).
   * Pair with {@link selectRepositoryTypeInBlock} or {@link getRepositoryGitCardInBlock} /
   * {@link getRepositoryHelmCardInBlock} / {@link getRepositoryObjectStorageCardInBlock}.
   */
  async expandRepositoryTypesSectionForRepositoryBlock(blockIndex: number): Promise<void> {
    await this.expandAccordionSectionIfCollapsed(
      this.getRepositoryTypesSectionToggleForRepositoryBlock(blockIndex)
    );
  }

  // ---------------------------------------------------------------------------
  // Channel repository type (Git / Helm / Object storage)
  // ---------------------------------------------------------------------------

  /**
   * Git repository card for the **first** block only — same as {@link getRepositoryGitCardInBlock} **`(0)`**.
   * With multiple blocks, unscoped `card-github` matches **n** tiles (Playwright strict mode); always scope
   * with {@link getRepositoryGitCardInBlock} / {@link getRepositoryBlockContainer}.
   */
  getGitChannelTypeButton(): Locator {
    return this.getRepositoryGitCardInBlock(0);
  }

  /** Helm card — first block only (see {@link getGitChannelTypeButton}). */
  getHelmChannelTypeButton(): Locator {
    return this.getRepositoryHelmCardInBlock(0);
  }

  /** Object storage card — first block only (see {@link getGitChannelTypeButton}). */
  getObjectStorageChannelTypeButton(): Locator {
    return this.getRepositoryObjectStorageCardInBlock(0);
  }

  /** Add another subscription / channel block */
  getAddChannelsButton(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.addChannelsButtonId);
  }

  /** Same as {@link getAddChannelsButton} — add another repository / subscription template. */
  getAddAnotherRepositoryButton(): Locator {
    return this.getAddChannelsButton();
  }

  /**
   * **Remove** a repository / subscription template block (see
   * {@link APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.deleteRepositoryBlockButtonSelector}).
   * Same ordering as {@link getRepositoryBlockContainer}.
   */
  getDeleteRepositoryBlockButton(blockIndex: number): Locator {
    const byBlockContainer = this.getRepositoryBlockContainer(blockIndex)
      .locator(APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.deleteRepositoryBlockButtonSelector)
      .first();
    const byRole = this.page.getByRole('button', { name: /^Delete repository$/i }).nth(blockIndex);
    return byBlockContainer.or(byRole).first();
  }

  /** Visible delete controls for extra repository/subscription blocks on edit form. */
  getDeleteRepositoryButtons(): Locator {
    return this.page
      .locator(APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.deleteRepositoryBlockButtonSelector)
      .or(this.page.getByRole('button', { name: /^Delete repository$/i }));
  }

  /**
   * A single repository / subscription template panel. **`0`** = first block.
   * Wrapper class: {@link APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.repositoryBlockContainerSelector}.
   */
  getRepositoryBlockContainer(blockIndex: number): Locator {
    return this.page
      .locator(APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.repositoryBlockContainerSelector)
      .nth(blockIndex);
  }

  /** All repository/subscription block containers in the form (for count/introspection). */
  getRepositoryBlockContainers(): Locator {
    return this.page.locator(APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.repositoryBlockContainerSelector);
  }

  /**
   * One "Repository types" toggle per repository block (`channel-repository-types`, `channelgrp1-repository-types`, ...).
   * More stable count signal than delete buttons (which can disappear when only one block remains).
   */
  getRepositoryTypeToggles(): Locator {
    return this.page.locator('button[id$="repository-types"]');
  }

  /**
   * Repository-type section toggles across all blocks.
   * Matches first block id (`channel-repository-types`) and additional block ids
   * (`channelgrp1-repository-types`, `channelgrp2-repository-types`, ...).
   */
  getRepositoryTypeSectionToggles(): Locator {
    return this.page.locator(
      `#${APP_SUBSCRIPTION_CREATE_WIZARD.sectionToggles.repositoryTypes}, [id^="channelgrp"][id$="-repository-types"]`
    );
  }

  /** Repository-type section toggle for a specific block index. */
  getRepositoryTypeSectionToggleInBlock(blockIndex: number): Locator {
    const id =
      blockIndex <= 0
        ? APP_SUBSCRIPTION_CREATE_WIZARD.sectionToggles.repositoryTypes
        : `channelgrp${blockIndex}-repository-types`;
    return this.byId(id);
  }

  /**
   * Git / Helm / Object cards reuse the same `data-testid` in **each** block — scope with
   * {@link getRepositoryBlockContainer} when more than one block exists.
   */
  private repositoryCardInBlock(
    card: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.repositoryCard,
    blockIndex: number
  ): Locator {
    const id = APP_SUBSCRIPTION_CREATE_WIZARD.testIds.repositoryCard[card];
    return this.getRepositoryBlockContainer(blockIndex).getByTestId(id);
  }

  getRepositoryGitCardInBlock(blockIndex: number): Locator {
    return this.repositoryCardInBlock('git', blockIndex);
  }

  getRepositoryHelmCardInBlock(blockIndex: number): Locator {
    return this.repositoryCardInBlock('helm', blockIndex);
  }

  getRepositoryObjectStorageCardInBlock(blockIndex: number): Locator {
    return this.repositoryCardInBlock('objectStorage', blockIndex);
  }

  /**
   * Git / Helm / Object **type** tile in `blockIndex` (same as {@link getRepositoryGitCardInBlock} / Helm / Object).
   */
  private getRepositoryTypeCardInBlock(
    blockIndex: number,
    kind: SubscriptionWizardRepositoryCardKind
  ): Locator {
    switch (kind) {
      case 'git':
        return this.getRepositoryGitCardInBlock(blockIndex);
      case 'helm':
        return this.getRepositoryHelmCardInBlock(blockIndex);
      case 'objectStorage':
        return this.getRepositoryObjectStorageCardInBlock(blockIndex);
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  }

  /** `true` when the tile looks selected (`aria-selected`, `pf-m-selected` on self or ancestor). */
  private async isRepositoryTypeCardSelected(card: Locator): Promise<boolean> {
    return card.evaluate((el) => {
      const node = el as HTMLElement;
      if (node.getAttribute('aria-selected') === 'true') return true;
      if (node.classList.contains('pf-m-selected')) return true;
      return node.closest('.pf-m-selected') !== null;
    });
  }

  /**
   * Ensures `kind` is selected for repository block `blockIndex`. **No-op** if that card is already selected,
   * avoiding flaky `click` timeouts when overlays intercept a redundant tap on the current selection (observed on live hub).
   *
   * **Prerequisite:** {@link expandRepositoryTypesSectionForRepositoryBlock} so tiles are visible.
   */
  async selectRepositoryTypeInBlock(
    blockIndex: number,
    kind: SubscriptionWizardRepositoryCardKind
  ): Promise<void> {
    const card = this.getRepositoryTypeCardInBlock(blockIndex, kind);
    if (await this.isRepositoryTypeCardSelected(card)) return;
    await card.click().catch(async () => {
      await card.click({ force: true });
    });
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Git fields
  // ---------------------------------------------------------------------------

  /** Git URL field in repository block `blockIndex` (additional blocks use `grpN` test ids). */
  getGitRepositoryUrlInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('urlCombo', blockIndex);
  }

  getGitUsernameInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('usernameText', blockIndex);
  }

  getGitPasswordOrTokenInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('tokenText', blockIndex);
  }

  getGitBranchInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('branchCombo', blockIndex);
  }

  getGitPathInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('pathCombo', blockIndex);
  }

  getGitDesiredCommitInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('commitText', blockIndex);
  }

  getGitTagInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('tagText', blockIndex);
  }

  getGitReconcileOptionInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('reconcileOptionCombo', blockIndex);
  }

  getGitReconcileRateInputInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('reconcileRateCombo', blockIndex);
  }

  getGitDisableAutoReconcileCheckboxInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('disableAutoReconcileCheckbox', blockIndex);
  }

  getGitInsecureSkipVerifyCheckboxInRepositoryBlock(blockIndex: number): Locator {
    return this.gitFieldInRepositoryBlock('insecureSkipVerifyCheckbox', blockIndex);
  }

  getGitRepositoryUrlInput(): Locator {
    return this.getGitRepositoryUrlInputInRepositoryBlock(0);
  }

  getGitUsernameInput(): Locator {
    return this.getGitUsernameInputInRepositoryBlock(0);
  }

  getGitPasswordOrTokenInput(): Locator {
    return this.getGitPasswordOrTokenInputInRepositoryBlock(0);
  }

  getGitBranchInput(): Locator {
    return this.getGitBranchInputInRepositoryBlock(0);
  }

  getGitPathInput(): Locator {
    return this.getGitPathInputInRepositoryBlock(0);
  }

  getGitDesiredCommitInput(): Locator {
    return this.getGitDesiredCommitInputInRepositoryBlock(0);
  }

  getGitTagInput(): Locator {
    return this.getGitTagInputInRepositoryBlock(0);
  }

  getGitReconcileOptionInput(): Locator {
    return this.getGitReconcileOptionInputInRepositoryBlock(0);
  }

  getGitReconcileRateInput(): Locator {
    return this.getGitReconcileRateInputInRepositoryBlock(0);
  }

  getGitDisableAutoReconcileCheckbox(): Locator {
    return this.getGitDisableAutoReconcileCheckboxInRepositoryBlock(0);
  }

  getGitInsecureSkipVerifyCheckbox(): Locator {
    return this.getGitInsecureSkipVerifyCheckboxInRepositoryBlock(0);
  }

  // ---------------------------------------------------------------------------
  // Helm fields
  // ---------------------------------------------------------------------------

  getHelmRepositoryUrlInputInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('urlCombo', blockIndex);
  }

  getHelmUsernameInputInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('usernameText', blockIndex);
  }

  getHelmPasswordInputInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('passwordText', blockIndex);
  }

  getHelmChartNameInputInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('chartNameText', blockIndex);
  }

  getHelmPackageAliasInputInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('packageAliasText', blockIndex);
  }

  getHelmPackageVersionInputInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('packageVersionText', blockIndex);
  }

  getHelmInsecureSkipVerifyCheckboxInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('insecureSkipVerifyCheckbox', blockIndex);
  }

  getHelmReconcileRateInputInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('reconcileRateCombo', blockIndex);
  }

  getHelmDisableAutoReconcileCheckboxInRepositoryBlock(blockIndex: number): Locator {
    return this.helmFieldInRepositoryBlock('disableAutoReconcileCheckbox', blockIndex);
  }

  getHelmRepositoryUrlInput(): Locator {
    return this.getHelmRepositoryUrlInputInRepositoryBlock(0);
  }

  getHelmUsernameInput(): Locator {
    return this.getHelmUsernameInputInRepositoryBlock(0);
  }

  getHelmPasswordInput(): Locator {
    return this.getHelmPasswordInputInRepositoryBlock(0);
  }

  getHelmChartNameInput(): Locator {
    return this.getHelmChartNameInputInRepositoryBlock(0);
  }

  getHelmPackageAliasInput(): Locator {
    return this.getHelmPackageAliasInputInRepositoryBlock(0);
  }

  getHelmPackageVersionInput(): Locator {
    return this.getHelmPackageVersionInputInRepositoryBlock(0);
  }

  getHelmInsecureSkipVerifyCheckbox(): Locator {
    return this.getHelmInsecureSkipVerifyCheckboxInRepositoryBlock(0);
  }

  getHelmReconcileRateInput(): Locator {
    return this.getHelmReconcileRateInputInRepositoryBlock(0);
  }

  getHelmDisableAutoReconcileCheckbox(): Locator {
    return this.getHelmDisableAutoReconcileCheckboxInRepositoryBlock(0);
  }

  // ---------------------------------------------------------------------------
  // Object storage fields
  // ---------------------------------------------------------------------------

  getObjectStoreUrlInputInRepositoryBlock(blockIndex: number): Locator {
    return this.objectStorageFieldInRepositoryBlock('urlCombo', blockIndex);
  }

  getObjectStoreAccessKeyInputInRepositoryBlock(blockIndex: number): Locator {
    return this.objectStorageFieldInRepositoryBlock('accessKeyText', blockIndex);
  }

  getObjectStoreSecretKeyInputInRepositoryBlock(blockIndex: number): Locator {
    return this.objectStorageFieldInRepositoryBlock('secretKeyText', blockIndex);
  }

  getObjectStoreRegionInputInRepositoryBlock(blockIndex: number): Locator {
    return this.objectStorageFieldInRepositoryBlock('regionText', blockIndex);
  }

  getObjectStoreSubfolderInputInRepositoryBlock(blockIndex: number): Locator {
    return this.objectStorageFieldInRepositoryBlock('subfolderText', blockIndex);
  }

  getObjectStoreUrlInput(): Locator {
    return this.getObjectStoreUrlInputInRepositoryBlock(0);
  }

  getObjectStoreAccessKeyInput(): Locator {
    return this.getObjectStoreAccessKeyInputInRepositoryBlock(0);
  }

  getObjectStoreSecretKeyInput(): Locator {
    return this.getObjectStoreSecretKeyInputInRepositoryBlock(0);
  }

  getObjectStoreRegionInput(): Locator {
    return this.getObjectStoreRegionInputInRepositoryBlock(0);
  }

  getObjectStoreSubfolderInput(): Locator {
    return this.getObjectStoreSubfolderInputInRepositoryBlock(0);
  }

  // ---------------------------------------------------------------------------
  // Cluster deployment & placement
  // ---------------------------------------------------------------------------

  getClusterDeploymentSectionToggle(): Locator {
    return this.getClusterDeploymentSectionToggleForRepositoryBlock(0);
  }

  /**
   * Expand **Select clusters for application deployment** for subscription block `blockIndex`
   * (`#clustersection-…` or `#clustersectiongrpN-…`).
   */
  getClusterDeploymentSectionToggleForRepositoryBlock(blockIndex: number): Locator {
    return this.byId(subscriptionWizardClusterDeploymentSectionToggleId(blockIndex));
  }

  /**
   * Expand **Select clusters for application deployment** for `blockIndex` so placement `data-testid`s and
   * cluster label controls mount. Idempotent — does not collapse an already-expanded section.
   */
  async expandClusterDeploymentSectionForRepositoryBlock(blockIndex: number): Promise<void> {
    await this.expandAccordionSectionIfCollapsed(
      this.getClusterDeploymentSectionToggleForRepositoryBlock(blockIndex)
    );
  }

  /**
   * **Settings: Specify application behavior** accordion title inside repository block `blockIndex`
   * (time window controls). Uses English title pattern from {@link APP_SUBSCRIPTION_CREATE_WIZARD.settings.sectionTitlePattern}.
   */
  getSettingsSectionToggleForRepositoryBlock(blockIndex: number): Locator {
    return this.getRepositoryBlockContainer(blockIndex)
      .locator('.creation-view-controls-title')
      .filter({ hasText: APP_SUBSCRIPTION_CREATE_WIZARD.settings.sectionTitlePattern });
  }

  /** Expand **Settings** for `blockIndex` (idempotent). */
  async expandSettingsSectionForRepositoryBlock(blockIndex: number): Promise<void> {
    await this.expandAccordionSectionIfCollapsed(
      this.getSettingsSectionToggleForRepositoryBlock(blockIndex)
    );
  }

  /**
   * **Configure automation for prehook and posthook** for `blockIndex`. Idempotent expand.
   * **Prerequisite:** repository type selected for this block.
   */
  async expandConfigurePrePostAutomationSectionForRepositoryBlock(blockIndex: number): Promise<void> {
    await this.expandAccordionSectionIfCollapsed(
      this.getConfigurePrePostAutomationSectionForRepositoryBlock(blockIndex)
    );
  }

  /**
   * Inline **Placement rule deprecation** banner in the cluster placement area.
   * **Prerequisite:** expand {@link expandClusterDeploymentSectionForRepositoryBlock} — copy is not in the DOM until that section is open. Uses `[class*="c-alert"]` because PF may not set `role="alert"` on the root in all builds.
   */
  getPlacementRuleDeprecationAlert(): Locator {
    const copy = APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementRuleDeprecation;
    return this.page
      .locator('[class*="c-alert"]')
      .filter({ hasText: new RegExp(copy.alertTitle, 'i') })
      .first();
  }

  /** Scoped to repository block `blockIndex` so unrelated page alerts do not affect assertions. */
  getPlacementRuleDeprecationAlertInRepositoryBlock(blockIndex: number): Locator {
    const copy = APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementRuleDeprecation;
    return this.getRepositoryBlockContainer(blockIndex)
      .locator('[class*="c-alert"]')
      .filter({ hasText: new RegExp(copy.alertTitle, 'i') });
  }

  /** **Select an existing placement configuration** radio for repository block `blockIndex`. */
  getExistingPlacementConfigurationRadioForRepositoryBlock(blockIndex: number): Locator {
    const label =
      APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementAccessibleNames
        .existingPlacementConfiguration;
    return this.getRepositoryBlockContainer(blockIndex).getByRole('radio', {
      name: new RegExp(label, 'i'),
    });
  }

  /** Existing **Placement** dropdown for repository block `blockIndex` (current + legacy test ids). */
  getExistingPlacementComboInRepositoryBlock(blockIndex: number): Locator {
    const currentCombo = this.byTestId(
      subscriptionWizardPlacementTestId('placementCombo', blockIndex)
    );
    return currentCombo.or(this.getPlacementRuleComboInRepositoryBlock(blockIndex)).first();
  }

  /** **Deploy on local cluster only** — accessible name (no stable `data-testid` on all hubs). */
  getLocalClusterOnlyCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /local cluster|deploy.*local|only.*local/i });
  }

  /**
   * **Deploy on local cluster only** scoped to repository block `blockIndex` (strict when multiple templates exist).
   */
  getLocalClusterOnlyCheckboxForRepositoryBlock(blockIndex: number): Locator {
    return this.getRepositoryBlockContainer(blockIndex).getByRole('checkbox', {
      name: /local cluster|deploy.*local|only.*local/i,
    });
  }

  /** **Online clusters only** — accessible name. */
  getOnlineClustersOnlyCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /online/i });
  }

  /** **Online clusters only** scoped to repository block `blockIndex`. */
  getOnlineClustersOnlyCheckboxForRepositoryBlock(blockIndex: number): Locator {
    return this.getRepositoryBlockContainer(blockIndex).getByRole('checkbox', { name: /online/i });
  }

  getClusterSelectorCheckbox(): Locator {
    return this.getClusterSelectorCheckboxForRepositoryBlock(0);
  }

  /**
   * **Deploy using cluster label selector** for subscription block `blockIndex`
   * (`#clusterSelector-checkbox-clusterSelector` or `…grpN`).
   */
  getClusterSelectorCheckboxForRepositoryBlock(blockIndex: number): Locator {
    return this.byId(subscriptionWizardClusterSelectorCheckboxId(blockIndex));
  }

  /**
   * **Deploy application resources on clusters with all specified labels** — PF `Radio` (not a checkbox;
   * `id` still uses legacy `clusterSelector-checkbox-*`). Use {@link clickClusterPlacementLabelSelectorRadio}, not
   * `setChecked(false)` (radios cannot be unchecked without choosing another option).
   */
  getClusterPlacementLabelSelectorRadioForRepositoryBlock(blockIndex: number): Locator {
    return this.getRepositoryBlockContainer(blockIndex).getByRole('radio', {
      name: /Deploy application resources on clusters with all specified labels/i,
    });
  }

  /** Select label-based placement for this repository block. */
  async clickClusterPlacementLabelSelectorRadio(blockIndex: number): Promise<void> {
    await this.getClusterPlacementLabelSelectorRadioForRepositoryBlock(blockIndex).click();
    await this.waitForLoad();
  }

  /**
   * Optional **legacy `#id`** label name control (prefer {@link getClusterPlacementLabelNameComboboxForRow} when PF ids are dynamic).
   * @param labelRowIndex — label row (`0` = first)
   * @param subscriptionBlockIndex — subscription template block (`0` = first)
   */
  getClusterSelectorLabelNameDomControl(
    labelRowIndex: number,
    subscriptionBlockIndex: number
  ): Locator {
    return this.byId(
      subscriptionWizardClusterSelectorLabelDomIds(labelRowIndex, subscriptionBlockIndex).labelNameId
    );
  }

  /** @see {@link getClusterSelectorLabelNameDomControl} */
  getClusterSelectorLabelValueDomControl(
    labelRowIndex: number,
    subscriptionBlockIndex: number
  ): Locator {
    return this.byId(
      subscriptionWizardClusterSelectorLabelDomIds(labelRowIndex, subscriptionBlockIndex).labelValueId
    );
  }

  getExistingPlacementRuleCheckbox(): Locator {
    return this.getExistingPlacementRuleCheckboxInRepositoryBlock(0);
  }

  /** Placement rule dropdown (when using an existing rule). */
  getPlacementRuleCombo(): Locator {
    return this.getPlacementRuleComboInRepositoryBlock(0);
  }

  getPlacementRuleComboLabel(): Locator {
    return this.getPlacementRuleCombo();
  }

  /**
   * Existing placement rule checkbox for repository block `blockIndex`
   * (e.g. `checkbox-existingrule-checkboxgrp1` for block `1`).
   */
  getExistingPlacementRuleCheckboxInRepositoryBlock(blockIndex: number): Locator {
    return this.byTestId(subscriptionWizardPlacementTestId('existingRuleCheckbox', blockIndex));
  }

  /** Placement rule combobox for repository block `blockIndex`. */
  getPlacementRuleComboInRepositoryBlock(blockIndex: number): Locator {
    return this.byTestId(subscriptionWizardPlacementTestId('placementRuleCombo', blockIndex));
  }

  /**
   * **Cluster sets** combobox by accessible name (stable when PF toggle ids are dynamic).
   */
  getClusterSetsCombobox(): Locator {
    const n =
      APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementAccessibleNames.clusterSets;
    return this.page.getByRole('combobox', { name: n });
  }

  /**
   * **Cluster sets** for repository block `blockIndex` when multiple blocks each expose the control
   * (same accessible name — **`.nth(blockIndex)`**).
   */
  getClusterSetsComboboxForRepositoryBlock(blockIndex: number): Locator {
    return this.getClusterSetsCombobox().nth(blockIndex);
  }

  /**
   * **Cluster sets** PF Select input (`#cluster-sets`) scoped to repository block — preferred for opening the menu.
   */
  getClusterSetsInputForRepositoryBlock(blockIndex: number): Locator {
    const id = APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.clusterSetsInputId;
    return this.getRepositoryBlockContainer(blockIndex).locator(`#${id}`);
  }

  getClusterPlacementLabelNameCombobox(): Locator {
    return this.clusterPlacementLabelCombobox('labelName');
  }

  /** Label row — **operator** combobox (e.g. “equals any of”). */
  getClusterPlacementLabelOperatorCombobox(): Locator {
    return this.clusterPlacementLabelCombobox('labelOperator');
  }

  getClusterPlacementLabelValueCombobox(): Locator {
    return this.clusterPlacementLabelCombobox('labelValue');
  }

  /**
   * Adds another **label** row (Label / Operator / Value) in the cluster selector placement area.
   * Same accessible names repeat per row — use {@link getClusterPlacementLabelNameComboboxForRow}, etc.
   */
  getClusterPlacementAddAnotherLabelButton(): Locator {
    return this.getClusterPlacementAddAnotherLabelButtonForRepositoryBlock(0);
  }

  /**
   * **Add another label** scoped to repository block `blockIndex` (required when multiple channel blocks exist).
   */
  getClusterPlacementAddAnotherLabelButtonForRepositoryBlock(blockIndex: number): Locator {
    const n =
      APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementAccessibleNames.addAnotherLabel;
    return this.getRepositoryBlockContainer(blockIndex).getByRole('button', { name: n });
  }

  /**
   * **Label** combobox for row `rowIndex` (`0` = first) in repository block `blockIndex`.
   * Prefer this over page-wide {@link clusterPlacementLabelCombobox} when more than one channel block is present.
   */
  getClusterPlacementLabelNameComboboxForRowInRepositoryBlock(
    blockIndex: number,
    rowIndex: number
  ): Locator {
    const n = APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementAccessibleNames.labelName;
    return this.getRepositoryBlockContainer(blockIndex).getByRole('combobox', { name: n }).nth(rowIndex);
  }

  /** **Operator** combobox for label row `rowIndex` in repository block `blockIndex`. */
  getClusterPlacementLabelOperatorComboboxForRowInRepositoryBlock(
    blockIndex: number,
    rowIndex: number
  ): Locator {
    const n = APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementAccessibleNames.labelOperator;
    return this.getRepositoryBlockContainer(blockIndex).getByRole('combobox', { name: n }).nth(rowIndex);
  }

  /** **Value** combobox for label row `rowIndex` in repository block `blockIndex`. */
  getClusterPlacementLabelValueComboboxForRowInRepositoryBlock(
    blockIndex: number,
    rowIndex: number
  ): Locator {
    const n = APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementAccessibleNames.labelValue;
    return this.getRepositoryBlockContainer(blockIndex).getByRole('combobox', { name: n }).nth(rowIndex);
  }

  /**
   * **Label** combobox for row `rowIndex` (`0` = first). Reuses the same accessible name on each row;
   * **`.nth(rowIndex)`** selects the correct instance after adding rows.
   */
  getClusterPlacementLabelNameComboboxForRow(rowIndex: number): Locator {
    return this.getClusterPlacementLabelNameComboboxForRowInRepositoryBlock(0, rowIndex);
  }

  /** **Operator** combobox for label row `rowIndex`. */
  getClusterPlacementLabelOperatorComboboxForRow(rowIndex: number): Locator {
    return this.getClusterPlacementLabelOperatorComboboxForRowInRepositoryBlock(0, rowIndex);
  }

  /** **Value** combobox for label row `rowIndex`. */
  getClusterPlacementLabelValueComboboxForRow(rowIndex: number): Locator {
    return this.getClusterPlacementLabelValueComboboxForRowInRepositoryBlock(0, rowIndex);
  }

  /**
   * Clicks an open PatternFly menu / listbox option whose label matches `optionText` (case-insensitive, trimmed).
   * Use after opening **Cluster sets** or label **Label** / **Value** comboboxes.
   * Supports PF v5 (`menu__list-item`) and v6 (`pf-v6-c-menu__item` + `role="option"` on `button`).
   */
  async pickOpenMenuItemByExactLabel(optionText: string): Promise<void> {
    const t = optionText.trim();
    const escaped = this.escapeRegExpForMenuLabel(t);
    const nameRe = new RegExp(`^\\s*${escaped}\\s*$`, 'i');
    /** PF v6 cluster label **Value** menus use `.pf-v6-c-menu__item` without `role="option"` on the row. */
    const v6Row = this.page.locator('.pf-v6-c-menu__item').filter({ hasText: nameRe });
    const option = v6Row
      .or(this.page.getByRole('option', { name: nameRe }))
      .or(this.page.locator('[class*="menu__list-item"]').filter({ hasText: nameRe }))
      .or(this.page.locator('[class*="c-menu__item"]').filter({ hasText: nameRe }))
      .first();
    await option.click({ timeout: 20_000 });
  }

  private escapeRegExpForMenuLabel(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Opens **Cluster sets** for `blockIndex` and selects a menu entry (e.g. `global`) — matches console PF Select behavior.
   */
  async pickClusterSetMenuOptionForRepositoryBlock(blockIndex: number, optionText: string): Promise<void> {
    const input = this.getClusterSetsInputForRepositoryBlock(blockIndex);
    if ((await input.count()) > 0) {
      await input.click();
    } else {
      await this.getClusterSetsComboboxForRepositoryBlock(blockIndex).click();
    }
    await this.pickOpenMenuItemByExactLabel(optionText);
    await this.waitForLoad();
  }

  /** Opens the **Label** combobox for `rowIndex` in `blockIndex` and selects `optionText` from the menu. */
  async pickClusterPlacementLabelNameMenuForRepositoryBlockRow(
    blockIndex: number,
    rowIndex: number,
    optionText: string
  ): Promise<void> {
    await this.getClusterPlacementLabelNameComboboxForRowInRepositoryBlock(blockIndex, rowIndex).click();
    await this.pickOpenMenuItemByExactLabel(optionText);
    await this.waitForLoad();
  }

  /** Opens the **Value** combobox for `rowIndex` in `blockIndex` and selects `optionText` from the menu. */
  async pickClusterPlacementLabelValueMenuForRepositoryBlockRow(
    blockIndex: number,
    rowIndex: number,
    optionText: string
  ): Promise<void> {
    await this.getClusterPlacementLabelValueComboboxForRowInRepositoryBlock(blockIndex, rowIndex).click();
    await this.pickOpenMenuItemByExactLabel(optionText);
    await this.waitForLoad();
  }

  /**
   * Multi-select **Value** menu entries in one session (do not toggle off already-selected items).
   */
  async pickClusterPlacementLabelValuesMenuForRepositoryBlockRow(
    blockIndex: number,
    rowIndex: number,
    values: string[]
  ): Promise<void> {
    const valueCombo = this.getClusterPlacementLabelValueComboboxForRowInRepositoryBlock(
      blockIndex,
      rowIndex
    );
    const valueMenuScope = this.getClusterSelectorLabelValueDomControl(rowIndex, blockIndex);
    await valueCombo.click();
    for (const value of values) {
      let option = valueMenuScope.getByLabel(value, { exact: true });
      if ((await option.count()) === 0) {
        option = this.page.getByLabel(value, { exact: true });
      }
      const selected = await option.getAttribute('aria-selected').catch(() => null);
      if (selected === 'true') {
        continue;
      }
      await option.click({ timeout: 7_000 });
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.waitForLoad();
  }

  // ---------------------------------------------------------------------------
  // Time window
  // ---------------------------------------------------------------------------

  /** Active / blocked radios for first subscription block (`blockIndex === 0`). */
  getTimeWindowActiveModeRadio(): Locator {
    return this.getTimeWindowActiveModeRadioForBlock(0);
  }

  getTimeWindowBlockedModeRadio(): Locator {
    return this.getTimeWindowBlockedModeRadioForBlock(0);
  }

  getTimeWindowDefaultModeRadio(): Locator {
    return this.getTimeWindowDefaultModeRadioForBlock(0);
  }

  /**
   * **Default** time window (no schedule — deploy anytime). Additional blocks: `default-mode-timeWindowgrpN`.
   */
  getTimeWindowDefaultModeRadioForBlock(blockIndex: number): Locator {
    return this.byId(subscriptionTimeWindowModeRadioIds(blockIndex).defaultId);
  }

  /** **Active** interval mode for subscription block `blockIndex`. */
  getTimeWindowActiveModeRadioForBlock(blockIndex: number): Locator {
    return this.byId(subscriptionTimeWindowModeRadioIds(blockIndex).activeId);
  }

  /**
   * **Blocked** interval mode for subscription block `blockIndex`.
   */
  getTimeWindowBlockedModeRadioForBlock(blockIndex: number): Locator {
    return this.byId(subscriptionTimeWindowModeRadioIds(blockIndex).blockedId);
  }

  /**
   * Weekday inclusion checkbox for time window (`Monday-timeWindow`, …).
   */
  getTimeWindowDayCheckbox(
    weekday: AppSubscriptionTimeWindowWeekday | string,
    blockIndex = 0
  ): Locator {
    return this.byId(subscriptionTimeWindowDayCheckboxId(weekday, blockIndex));
  }

  /** Start time for interval row `rangeIndex` (`#start-time-{n}-timeWindow…-input`). */
  getTimeWindowStartTimeInput(rangeIndex: number, blockIndex = 0): Locator {
    return this.byId(subscriptionTimeWindowRangeInputIds(rangeIndex, blockIndex).startId);
  }

  /** End time for interval row `rangeIndex`. */
  getTimeWindowEndTimeInput(rangeIndex: number, blockIndex = 0): Locator {
    return this.byId(subscriptionTimeWindowRangeInputIds(rangeIndex, blockIndex).endId);
  }

  /** Timezone subsection. */
  getTimeWindowTimezoneSection(): Locator {
    return this.page.locator(APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.timezoneSectionSelector);
  }

  /**
   * **Select timezone** / **Choose a location** typeahead inside repository block `blockIndex` (under
   * `.config-timezone-section`). Requires active or blocked time-window mode so the control is enabled.
   */
  getTimeWindowTimezoneComboboxForRepositoryBlock(blockIndex: number): Locator {
    return this.getRepositoryBlockContainer(blockIndex)
      .locator(APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.timezoneSectionSelector)
      .getByRole('combobox', { name: APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.timezoneComboboxNameRe });
  }

  /** Opens the timezone typeahead, filters by `ianaTimezone`, and picks the matching menu row. */
  async pickTimeWindowTimezoneMenuOptionForRepositoryBlock(
    blockIndex: number,
    ianaTimezone: string
  ): Promise<void> {
    const tz = ianaTimezone.trim();
    const cb = this.getTimeWindowTimezoneComboboxForRepositoryBlock(blockIndex);
    await cb.click();
    await cb.fill(tz);
    await this.pickOpenMenuItemByExactLabel(tz);
    await this.waitForLoad();
  }

  /**
   * **Add another time range** (additional start/end pair). Use **`.nth(blockIndex)`** when multiple blocks
   * each expose their own control.
   */
  getTimeWindowAddAnotherTimeRangeButton(blockIndex = 0): Locator {
    return this.page
      .getByRole('button', {
        name: APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.addAnotherTimeRangeButtonAccessibleName,
      })
      .nth(blockIndex);
  }

  // ---------------------------------------------------------------------------
  // Automation (pre / post hooks) — Ansible / credentials
  // ---------------------------------------------------------------------------

  /**
   * Expand/collapse **Configure automation for prehook and posthook** — `#…` on the section control
   * (see {@link subscriptionAutomationPrePostSectionToggleId}).
   *
   * **Prerequisite:** a **repository type** (Git / Helm / Object) must be selected or this section may not
   * be in the DOM yet.
   */
  getConfigurePrePostAutomationSection(): Locator {
    return this.getConfigurePrePostAutomationSectionForRepositoryBlock(0);
  }

  /**
   * Same as {@link getConfigurePrePostAutomationSection} for an **additional** repository block.
   *
   * Prefer **scoped** `.creation-view-controls-title` + section copy (same pattern as
   * {@link getSettingsSectionToggleForRepositoryBlock}) — current hubs may not render
   * `#perpostsectiongrp{N}-set-pre-and-post-deployment-tasks`. Fallback: {@link subscriptionAutomationPrePostSectionToggleId}.
   */
  getConfigurePrePostAutomationSectionForRepositoryBlock(blockIndex: number): Locator {
    const block = this.getRepositoryBlockContainer(blockIndex);
    const byTitle = block
      .locator('.creation-view-controls-title')
      .filter({
        hasText: new RegExp(APP_SUBSCRIPTION_CREATE_WIZARD.automation.configurePrePostToggleAccessibleText, 'i'),
      });
    return byTitle.or(this.byId(subscriptionAutomationPrePostSectionToggleId(blockIndex)));
  }

  /**
   * Section title text (**Configure automation for prehook and posthook**). Prefer **clicking this** to expand
   * when {@link getConfigurePrePostAutomationToggle} does not resolve (some hubs do not expose a matching
   * `role="button"` name on the accordion).
   */
  getConfigurePrePostAutomationSectionTitle(): Locator {
    return this.page.getByText(
      APP_SUBSCRIPTION_CREATE_WIZARD.automation.configurePrePostToggleAccessibleText,
      { exact: true }
    );
  }

  /**
   * Accordion control by **accessible name** (`role="button"`) **or** the section `#id` fallback.
   * If clicks time out, use {@link getConfigurePrePostAutomationSectionTitle} instead.
   */
  getConfigurePrePostAutomationToggle(): Locator {
    const t = APP_SUBSCRIPTION_CREATE_WIZARD.automation.configurePrePostToggleAccessibleText;
    return this.page
      .getByRole('button', { name: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .or(this.getConfigurePrePostAutomationSection());
  }

  /** Static label text before the Ansible / Tower credential control. */
  getAnsibleAutomationPlatformCredentialLabel(): Locator {
    return this.page.getByText(
      APP_SUBSCRIPTION_CREATE_WIZARD.automation.ansibleCredentialLabelText,
      { exact: true }
    );
  }

  /** “More info” beside **Ansible Automation Platform credential**. */
  getAnsibleConnectionLabelHelpButton(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.automation.connectionLabelHelpButtonId);
  }

  /**
   * Ansible credential **Type to filter** input in repository block `blockIndex`.
   * Chains {@link APP_SUBSCRIPTION_CREATE_WIZARD.automation.ansibleCredentialLabelText} outer **combobox** then the
   * inner **Type to filter** control — many Git / placement comboboxes share that inner name alone (strict mode).
   */
  getAnsibleCredentialTypeFilterComboboxInRepositoryBlock(blockIndex: number): Locator {
    const filterName =
      APP_SUBSCRIPTION_CREATE_WIZARD.automation.credentialTypeFilterComboboxAccessibleName;
    return this.getRepositoryBlockContainer(blockIndex)
      .getByRole('combobox', {
        name: new RegExp(
          APP_SUBSCRIPTION_CREATE_WIZARD.automation.ansibleCredentialLabelText.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          ),
          'i'
        ),
      })
      .getByRole('combobox', { name: filterName });
  }

  /**
   * Menu toggle on the Ansible credential PF Select (pair with
   * {@link getAnsibleCredentialTypeFilterComboboxInRepositoryBlock} for the typeahead).
   */
  getAnsibleCredentialTypeMenuToggleButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_SUBSCRIPTION_CREATE_WIZARD.automation.credentialTypeMenuToggleAccessibleName,
    });
  }

  /**
   * Combobox / input for selecting an **existing** secret (ALC placeholder). Prefer
   * **`getByPlaceholder`** — stable vs purely structural CSS.
   */
  getSelectExistingSecretCombobox(): Locator {
    const ph = APP_SUBSCRIPTION_CREATE_WIZARD.automation.existingSecretPlaceholder;
    return this.page.getByPlaceholder(ph).or(this.page.locator(`input[placeholder="${ph}"]`));
  }

  /**
   * Opens the **Add credential** wizard modal. **Visibility:** on a live hub this button was
   * **not** present until after credential-type selection in some flows; use
   * {@link getAnsibleCredentialTypeFilterComboboxInRepositoryBlock} first if the button is missing.
   */
  getAddCredentialButton(): Locator {
    return this.page.getByRole('button', {
      name: APP_SUBSCRIPTION_CREATE_WIZARD.automation.addCredentialButtonAccessibleName,
    });
  }

  /**
   * `#ansibleSecretName{N}-label` for an **additional** subscription block (`blockIndex` ≥ `1`).
   * Not seen on a 2-block **create** flow until automation is expanded (may be edit-only on some hubs).
   */
  getAnsibleSecretNameLabelForAdditionalRepositoryBlock(blockIndex: number): Locator {
    const id = subscriptionAutomationAnsibleSecretNameLabelId(blockIndex);
    if (!id) {
      throw new Error(
        'blockIndex must be >= 1 — the first subscription uses the shared automation section, not ansibleSecretName{N}-label.'
      );
    }
    return this.byId(id);
  }

  // ---------------------------------------------------------------------------
  // Add credential modal (Ansible / Tower wizard)
  // ---------------------------------------------------------------------------

  /**
   * Root **Add credential** dialog. **Steps:** fill **credentials name** + **namespace**, **Next** →
   * **ansibleHost** / **ansibleToken** (see {@link APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal}).
   */
  getAddCredentialDialog(): Locator {
    return this.page
      .locator(APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal.dialogSelector)
      .filter({
        has: this.page.getByRole('heading', { name: 'Add credential', exact: true }),
      });
  }

  getAddCredentialCredentialsNameInput(): Locator {
    return this.getAddCredentialDialog().locator(
      `#${APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal.credentialsNameInputId}`
    );
  }

  getAddCredentialNamespaceInput(): Locator {
    return this.getAddCredentialDialog().getByPlaceholder(
      APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal.namespacePlaceholder
    );
  }

  getAddCredentialNamespaceCombobox(): Locator {
    return this.getAddCredentialDialog().getByRole('combobox', {
      name: APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal.namespaceComboboxAccessibleName,
    });
  }

  /** PF6 namespace picker: type filter then choose menu item (Cypress parity). */
  async pickAddCredentialNamespace(namespace: string): Promise<void> {
    const trimmed = namespace.trim();
    const combobox = this.getAddCredentialNamespaceCombobox();
    await combobox.waitFor({ state: 'visible', timeout: 30_000 });
    await combobox.click();
    await combobox.fill(trimmed);
    const menuItem = this.page.getByRole('menuitem', { name: trimmed, exact: true });
    const option = this.page.getByRole('option', { name: trimmed, exact: true });
    if ((await menuItem.count()) > 0) {
      await menuItem.first().click();
    } else {
      await option.first().click();
    }
  }

  getAddCredentialDialogNextButton(): Locator {
    return this.getAddCredentialDialog().getByRole('button', {
      name: APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal.nextButtonAccessibleName,
    });
  }

  /** Shown on the Ansible connection step (after **Next**). */
  getAddCredentialAnsibleHostInput(): Locator {
    return this.getAddCredentialDialog().locator(
      `#${APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal.ansibleHostInputId}`
    );
  }

  getAddCredentialAnsibleTokenInput(): Locator {
    return this.getAddCredentialDialog().locator(
      `#${APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal.ansibleTokenInputId}`
    );
  }

  /** Primary **Add** on the final step. */
  getAddCredentialDialogAddButton(): Locator {
    return this.getAddCredentialDialog().getByRole('button', {
      name: APP_SUBSCRIPTION_CREATE_WIZARD.addCredentialModal.addButtonAccessibleName,
      exact: true,
    });
  }
}
