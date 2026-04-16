import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { OcCliService } from '@services/OcCliService';
import {
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
 */
export class SubscriptionApplicationCreateWizardPage extends BasePage {
  constructor(
    page: Page,
    private readonly oc: OcCliService
  ) {
    super(page);
  }

  private byId(elementId: string): Locator {
    return this.page.locator(`#${elementId}`);
  }

  private byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /** Git control in repository block `blockIndex` (`0` = first) — suffixed `data-testid` (e.g. `combo-githubURLgrp1`). */
  private gitFieldInRepositoryBlock(
    testIdKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.git,
    blockIndex: number
  ): Locator {
    return this.byTestId(subscriptionWizardGitTestId(testIdKey, blockIndex));
  }

  /** Helm control in repository block `blockIndex` (e.g. `combo-helmURLgrp1`). */
  private helmFieldInRepositoryBlock(
    testIdKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.helm,
    blockIndex: number
  ): Locator {
    return this.byTestId(subscriptionWizardHelmTestId(testIdKey, blockIndex));
  }

  /** Object storage control in repository block `blockIndex` (e.g. `combo-objectstoreURLgrp1`). */
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
    const consoleUrl = await this.oc.getConsoleUrl();
    await this.page.goto(`${consoleUrl}${APP_SUBSCRIPTION_CREATE_WIZARD.routePath}`);
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

  /** Discard wizard changes (toolbar). */
  getCancelButton(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.shell.cancelButtonId);
  }

  /** Primary Create — `data-testid` from {@link APP_SUBSCRIPTION_CREATE_WIZARD.testIds.actions.create}. */
  getCreateButton(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.actions.create);
  }

  /** Last primary button (save / create) in the wizard chrome. */
  getPrimarySubmitButton(): Locator {
    return this.page.locator('.pf-v5-c-button.pf-m-primary').last();
  }

  /** Visibility anchor before submit (same as {@link getCreateButton}). */
  getCreateButtonPortalAnchor(): Locator {
    return this.getCreateButton();
  }

  getNotificationsRegion(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.notificationsRegionId);
  }

  /** Toggle form vs YAML editor */
  getYamlToggle(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.yamlToggleId);
  }

  // ---------------------------------------------------------------------------
  // General — application name & namespace
  // ---------------------------------------------------------------------------

  getApplicationNameInput(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.general.applicationNameText);
  }

  /** Namespace **combobox** (`combo-emanspace`). */
  getNamespaceInput(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.general.namespaceCombo);
  }

  // ---------------------------------------------------------------------------
  // Repository sections (accordion toggles)
  // ---------------------------------------------------------------------------

  getRepositoryLocationSectionToggle(): Locator {
    return this.byId(APP_SUBSCRIPTION_CREATE_WIZARD.sectionToggles.repositoryLocation);
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

  // ---------------------------------------------------------------------------
  // Channel repository type (Git / Helm / Object storage)
  // ---------------------------------------------------------------------------

  /**
   * Git repository card. Use `.last()` when multiple channel groups exist on the page.
   */
  getGitChannelTypeButton(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.repositoryCard.git);
  }

  getHelmChannelTypeButton(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.repositoryCard.helm);
  }

  getObjectStorageChannelTypeButton(): Locator {
    return this.byTestId(APP_SUBSCRIPTION_CREATE_WIZARD.testIds.repositoryCard.objectStorage);
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
    return this.page
      .locator(APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.deleteRepositoryBlockButtonSelector)
      .nth(blockIndex);
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

  /** **Deploy on local cluster only** — accessible name (no stable `data-testid` on all hubs). */
  getLocalClusterOnlyCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /local cluster|deploy.*local|only.*local/i });
  }

  /** **Online clusters only** — accessible name. */
  getOnlineClustersOnlyCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /online/i });
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
    const n =
      APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.placementAccessibleNames.addAnotherLabel;
    return this.page.getByRole('button', { name: n });
  }

  /**
   * **Label** combobox for row `rowIndex` (`0` = first). Reuses the same accessible name on each row;
   * **`.nth(rowIndex)`** selects the correct instance after adding rows.
   */
  getClusterPlacementLabelNameComboboxForRow(rowIndex: number): Locator {
    return this.clusterPlacementLabelComboboxForRow('labelName', rowIndex);
  }

  /** **Operator** combobox for label row `rowIndex`. */
  getClusterPlacementLabelOperatorComboboxForRow(rowIndex: number): Locator {
    return this.clusterPlacementLabelComboboxForRow('labelOperator', rowIndex);
  }

  /** **Value** combobox for label row `rowIndex`. */
  getClusterPlacementLabelValueComboboxForRow(rowIndex: number): Locator {
    return this.clusterPlacementLabelComboboxForRow('labelValue', rowIndex);
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
   * Expand/collapse **Configure automation for prehook and posthook** (PatternFly accordion `Toggle`).
   */
  getConfigurePrePostAutomationSection(): Locator {
    return this.getConfigurePrePostAutomationSectionForRepositoryBlock(0);
  }

  /**
   * Same as {@link getConfigurePrePostAutomationSection} for an **additional** repository block
   * (see {@link subscriptionAutomationPrePostSectionToggleId}).
   */
  getConfigurePrePostAutomationSectionForRepositoryBlock(blockIndex: number): Locator {
    return this.byId(subscriptionAutomationPrePostSectionToggleId(blockIndex));
  }

  /**
   * Same control by **accessible name** (pattern: PF may expose **Toggle** + section title in the tree).
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
   * PF **Select** inner combobox to filter credential type (`Type to filter`). Parent toggle uses
   * **dynamic** `pf-select-toggle-id-*` — use this or {@link getAnsibleCredentialTypeFilterComboboxScoped}
   * instead of raw ids.
   */
  getAnsibleCredentialTypeFilterCombobox(): Locator {
    const n =
      APP_SUBSCRIPTION_CREATE_WIZARD.automation.credentialTypeFilterComboboxAccessibleName;
    return this.page.getByRole('combobox', { name: n });
  }

  /**
   * **Type to filter** combobox near the Ansible **connection** help control (when several
   * `Type to filter` comboboxes exist, prefer this over {@link getAnsibleCredentialTypeFilterCombobox}).
   */
  getAnsibleCredentialTypeFilterComboboxScoped(): Locator {
    return this.getAnsibleConnectionLabelHelpButton()
      .locator('..')
      .locator('..')
      .getByRole('combobox', {
        name: APP_SUBSCRIPTION_CREATE_WIZARD.automation.credentialTypeFilterComboboxAccessibleName,
      })
      .first();
  }

  /** Menu toggle on the Ansible credential PF Select (pair with {@link getAnsibleCredentialTypeFilterCombobox}). */
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
   * {@link getAnsibleCredentialTypeFilterCombobox} first if the button is missing.
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

  /** Root **Add credential** dialog. */
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
