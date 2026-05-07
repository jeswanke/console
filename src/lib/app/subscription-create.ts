/**
 * Subscription **create** wizard orchestration for **Playwright** tests only (`@playwright/test`,
 * {@link SubscriptionApplicationCreateWizardPage}). For exploratory hub verification,
 * use the **Playwriter** CLI against your logged-in Chrome session.
 */
import { expect, type Locator } from '@playwright/test';
import {
  APP_SUBSCRIPTION_CREATE_WIZARD,
  type AppSubscriptionTimeWindowWeekday,
  type SubscriptionWizardRepositoryCardKind,
} from '@constants/app';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

// ---------------------------------------------------------------------------
// Git — maps to APP_SUBSCRIPTION_CREATE_WIZARD.testIds.git + *InRepositoryBlock
// ---------------------------------------------------------------------------

export interface GitSubscriptionRepositoryFields {
  kind: 'git';
  /** Required */
  url: string;
  /** Defaults to `main` in {@link createSubscription} when omitted */
  branch?: string;
  username?: string;
  /** Private repo token / access id */
  token?: string;
  path?: string;
  desiredCommit?: string;
  tag?: string;
  reconcileOption?: string;
  reconcileRate?: string;
  disableAutoReconcile?: boolean;
  insecureSkipVerify?: boolean;
}

// ---------------------------------------------------------------------------
// Helm — maps to testIds.helm
// ---------------------------------------------------------------------------

export interface HelmSubscriptionRepositoryFields {
  kind: 'helm';
  /** Required */
  url: string;
  username?: string;
  password?: string;
  chartName?: string;
  packageAlias?: string;
  packageVersion?: string;
  reconcileRate?: string;
  insecureSkipVerify?: boolean;
  disableAutoReconcile?: boolean;
}

// ---------------------------------------------------------------------------
// Object storage — maps to testIds.objectStorage
// ---------------------------------------------------------------------------

export interface ObjectStorageSubscriptionRepositoryFields {
  kind: 'objectStorage';
  /** Required */
  url: string;
  accessKey?: string;
  secretKey?: string;
  region?: string;
  subfolder?: string;
}

export type SubscriptionRepositorySpec =
  | GitSubscriptionRepositoryFields
  | HelmSubscriptionRepositoryFields
  | ObjectStorageSubscriptionRepositoryFields;

// ---------------------------------------------------------------------------
// Select clusters for application deployment (per block)
// ---------------------------------------------------------------------------

export interface ClusterLabelSelectorRowSpec {
  /**
   * **Label** key — {@link createSubscription} opens the PF menu and picks this option (not a raw `fill`), matching
   * the console (e.g. `name`).
   */
  labelName?: string;
  /** **Operator** — typed into the combobox when set (e.g. `equals any of`). */
  labelOperator?: string;
  /**
   * **Value** — menu pick when set (e.g. `local-cluster`).
   */
  labelValue?: string;
}

export interface ClusterDeploymentSpec {
  localClusterOnly?: boolean;
  onlineClustersOnly?: boolean;
  /**
   * **Use an existing placement rule** — `true` / `false` sets the checkbox; omit to leave unchanged.
   * When checked, you can set {@link placementRuleComboText}.
   */
  useExistingPlacementRule?: boolean;
  /** Typed into {@link SubscriptionApplicationCreateWizardPage.getPlacementRuleComboInRepositoryBlock} */
  placementRuleComboText?: string;
  /**
   * **Deploy using cluster label selector** — `true` / `false` toggles; omit to leave unchanged.
   * When enabled, use {@link clusterSet} and {@link labelSelectorRows}.
   */
  useClusterLabelSelector?: boolean;
  /**
   * **Cluster sets** menu selection (e.g. `global`) — {@link createSubscription} opens the combobox and picks this
   * item; it does not use `fill` alone on the toggle.
   */
  clusterSet?: string;
  /** Label rows (row `0` first; additional rows trigger **Add another label**). */
  labelSelectorRows?: ClusterLabelSelectorRowSpec[];
}

// ---------------------------------------------------------------------------
// Settings — time window (per block)
// ---------------------------------------------------------------------------

export interface TimeWindowSpec {
  /**
   * Matches subscription wizard radios: **`default`** (always / no window), **`active`** (deploy only in
   * windows), **`blocked`** (do not deploy in windows). Timezone / weekdays / ranges apply only to
   * `active` and `blocked` (the console hides them for `default`).
   */
  mode?: 'default' | 'active' | 'blocked';
  /**
   * IANA time zone string shown in the **Choose a location** / **Select timezone** control when
   * `mode` is `active` or `blocked` (see console validation).
   */
  timezone?: string;
  /** Toggle weekday inclusion (`true` = checked) */
  weekdays?: Partial<Record<AppSubscriptionTimeWindowWeekday | string, boolean>>;
  /** Time ranges (row `0` first; further rows use **Add another time range**). */
  ranges?: Array<{ start: string; end: string }>;
  /** After filling `ranges`, click **Add another time range** this many extra times (empty rows). */
  extraTimeRangeRows?: number;
}

// ---------------------------------------------------------------------------
// Configure automation — prehook / posthook (per block)
// ---------------------------------------------------------------------------

export interface AutomationSpec {
  /** **Type to filter** — Ansible credential category combobox */
  credentialTypeFilter?: string;
  /** Existing secret placeholder field (after a template is chosen in the filter) */
  existingAnsibleSecret?: string;
}

// ---------------------------------------------------------------------------

export interface PerBlockSubscriptionSpec {
  clusterDeployment?: ClusterDeploymentSpec;
  /** **Settings: Specify application behavior** — scheduling / time window */
  timeWindow?: TimeWindowSpec;
  /** **Configure automation for prehook and posthook** */
  automation?: AutomationSpec;
}

export interface CreateSubscriptionOptions {
  applicationName: string;
  /** Typed into the namespace combobox (existing or new name) */
  namespace: string;
  /** Repository blocks in order (`0` = first). Define in e2e-spec-data (`blocks[].use` / subscription); not defaulted in TS. */
  repositories: SubscriptionRepositorySpec[];
  /**
   * Optional **cluster deployment**, **time window**, and **automation** per repository block (`perBlock[i]` ↔
   * `repositories[i]`). Applied after channel fields. Values come only from this object / merged e2e-spec-data —
   * no TypeScript default wizard payload is merged at runtime.
   */
  perBlock?: (PerBlockSubscriptionSpec | undefined)[];
  /**
   * Scenario metadata (e.g. `subscription_full_wizard` vs `subscription_explicit_channels`). `createSubscription`
   * applies `perBlock?.[i]` whenever those sections are present; use `perBlock` entries to control what runs.
   */
  fillEntireWizard?: boolean;
  /** Call {@link SubscriptionApplicationCreateWizardPage.collapseYamlEditor} first (default `true`) */
  ensureFormMode?: boolean;
  /** Click primary **Create** when done (default `true`) */
  submit?: boolean;
  /**
   * When **false** (default): if an Application CR already exists for `applicationName`/`namespace`, {@link createSubscription}
   * skips the wizard, navigates to that application’s **Details** tab (same URL as post–Create), then returns.
   * If it does not exist, runs the wizard as usual.
   * When **true**: if that Application already exists, throws before the wizard (treat duplicate as an error).
   */
  applicationExistsError?: boolean;
}

export interface AddSubscriptionToExistingApplicationOptions {
  /** Existing application name to edit. */
  applicationName: string;
  /** Existing application namespace to edit. */
  namespace: string;
  /** New repository blocks to append (`0` = first added block). */
  repositories: SubscriptionRepositorySpec[];
  /** Optional extras aligned to `repositories` indexes above. */
  perBlock?: (PerBlockSubscriptionSpec | undefined)[];
  /** Call {@link SubscriptionApplicationCreateWizardPage.collapseYamlEditor} first (default `true`) */
  ensureFormMode?: boolean;
  /** Click primary **Update** when done (default `true`) */
  submit?: boolean;
  /** Where edit flow is opened from: Applications list row actions or Details page actions. Default `list`. */
  entry?: 'list' | 'details';
  /**
   * Optional explicit edit URL expectation. When omitted, asserts the standard
   * `/multicloud/applications/edit/subscription/{namespace}/{applicationName}` route.
   */
  expectedEditUrl?: string | RegExp;
  /**
   * Optional post-submit URL expectation. When omitted, defaults to Applications list
   * for `entry: 'list'` and Details tab for `entry: 'details'`.
   */
  expectedPostSubmitUrl?: string | RegExp;
  /** Timeout for edit/post-submit URL assertions. */
  expectedUrlTimeout?: number;
}

/**
 * Opens an existing subscription application in **Edit** mode, updates one or more existing repository blocks
 * in place, and optionally clicks **Update**.
 */
export interface EditSubscriptionInExistingApplicationOptions {
  applicationName: string;
  namespace: string;
  /** Repository payloads to apply to existing blocks (index-aligned). */
  repositories: SubscriptionRepositorySpec[];
  /**
   * Per-block extras applied to the same indexes as `repositories`.
   * Useful for placement/time-window/automation edits.
   */
  perBlock?: (PerBlockSubscriptionSpec | undefined)[];
  /** Ensure YAML editor is collapsed before filling form controls. */
  ensureFormMode?: boolean;
  /** Click Update after applying edits. */
  submit?: boolean;
  /**
   * Where to enter edit flow from:
   * - `details`: open from Details page
   * - `list`: open from Applications list
   */
  entry?: 'details' | 'list';
  /** Optional explicit edit URL expectation (string or regex). */
  expectedEditUrl?: string | RegExp;
  /** Optional explicit post-submit URL expectation (string or regex). */
  expectedPostSubmitUrl?: string | RegExp;
  /** Timeout for URL assertions. */
  expectedUrlTimeout?: number;
}

export interface DeleteSubscriptionFromExistingApplicationOptions {
  /** Existing application name to edit. */
  applicationName: string;
  /** Existing application namespace to edit. */
  namespace: string;
  /**
   * Zero-based repository block index to remove from edit form.
   * Defaults to the last block.
   */
  deleteBlockIndex?: number;
  /** Call {@link SubscriptionApplicationCreateWizardPage.collapseYamlEditor} first (default `true`) */
  ensureFormMode?: boolean;
  /** Click primary **Update** when done (default `true`) */
  submit?: boolean;
  /** Where edit flow is opened from: Applications list row actions or Details page actions. Default `details`. */
  entry?: 'list' | 'details';
  /**
   * Optional explicit edit URL expectation. When omitted, asserts the standard
   * `/multicloud/applications/edit/subscription/{namespace}/{applicationName}` route.
   */
  expectedEditUrl?: string | RegExp;
  /**
   * Optional post-submit URL expectation. When omitted, defaults to edit route for `entry: 'details'`
   * and Applications list for `entry: 'list'`.
   */
  expectedPostSubmitUrl?: string | RegExp;
  /** Timeout for edit/post-submit URL assertions. */
  expectedUrlTimeout?: number;
}

async function fillIfDefined(locator: Locator, value: string | undefined): Promise<void> {
  if (value === undefined) return;
  await locator.fill(value);
}

async function setCheckboxIfDefined(locator: Locator, checked: boolean | undefined): Promise<void> {
  if (checked === undefined) return;
  const box = locator.first();
  // Placement UI hides some checkboxes depending on mode (e.g. label selector vs local-only).
  // Unchecking false must not wait on a non-existent control — avoids Playwright timeout.
  const visible = await box.isVisible().catch(() => false);
  if (!visible) {
    if (checked === false) return;
    await box.waitFor({ state: 'visible', timeout: 30_000 });
  }
  await box.setChecked(checked);
}

async function fillGitRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: GitSubscriptionRepositoryFields
): Promise<void> {
  await wizard.getGitRepositoryUrlInputInRepositoryBlock(blockIndex).fill(spec.url);
  await wizard.getGitBranchInputInRepositoryBlock(blockIndex).fill(spec.branch ?? 'main');
  await fillIfDefined(wizard.getGitUsernameInputInRepositoryBlock(blockIndex), spec.username);
  await fillIfDefined(wizard.getGitPasswordOrTokenInputInRepositoryBlock(blockIndex), spec.token);
  await fillIfDefined(wizard.getGitPathInputInRepositoryBlock(blockIndex), spec.path);
  await fillIfDefined(wizard.getGitDesiredCommitInputInRepositoryBlock(blockIndex), spec.desiredCommit);
  await fillIfDefined(wizard.getGitTagInputInRepositoryBlock(blockIndex), spec.tag);
  await fillIfDefined(wizard.getGitReconcileOptionInputInRepositoryBlock(blockIndex), spec.reconcileOption);
  await fillIfDefined(wizard.getGitReconcileRateInputInRepositoryBlock(blockIndex), spec.reconcileRate);
  await setCheckboxIfDefined(
    wizard.getGitDisableAutoReconcileCheckboxInRepositoryBlock(blockIndex),
    spec.disableAutoReconcile
  );
  await setCheckboxIfDefined(
    wizard.getGitInsecureSkipVerifyCheckboxInRepositoryBlock(blockIndex),
    spec.insecureSkipVerify
  );
}

async function fillHelmRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: HelmSubscriptionRepositoryFields
): Promise<void> {
  await wizard.getHelmRepositoryUrlInputInRepositoryBlock(blockIndex).fill(spec.url);
  await fillIfDefined(wizard.getHelmUsernameInputInRepositoryBlock(blockIndex), spec.username);
  await fillIfDefined(wizard.getHelmPasswordInputInRepositoryBlock(blockIndex), spec.password);
  await fillIfDefined(wizard.getHelmChartNameInputInRepositoryBlock(blockIndex), spec.chartName);
  await fillIfDefined(wizard.getHelmPackageAliasInputInRepositoryBlock(blockIndex), spec.packageAlias);
  await fillIfDefined(wizard.getHelmPackageVersionInputInRepositoryBlock(blockIndex), spec.packageVersion);
  await fillIfDefined(wizard.getHelmReconcileRateInputInRepositoryBlock(blockIndex), spec.reconcileRate);
  await setCheckboxIfDefined(
    wizard.getHelmInsecureSkipVerifyCheckboxInRepositoryBlock(blockIndex),
    spec.insecureSkipVerify
  );
  await setCheckboxIfDefined(
    wizard.getHelmDisableAutoReconcileCheckboxInRepositoryBlock(blockIndex),
    spec.disableAutoReconcile
  );
}

async function fillObjectStorageRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: ObjectStorageSubscriptionRepositoryFields
): Promise<void> {
  await wizard.getObjectStoreUrlInputInRepositoryBlock(blockIndex).fill(spec.url);
  await fillIfDefined(wizard.getObjectStoreAccessKeyInputInRepositoryBlock(blockIndex), spec.accessKey);
  await fillIfDefined(wizard.getObjectStoreSecretKeyInputInRepositoryBlock(blockIndex), spec.secretKey);
  await fillIfDefined(wizard.getObjectStoreRegionInputInRepositoryBlock(blockIndex), spec.region);
  await fillIfDefined(wizard.getObjectStoreSubfolderInputInRepositoryBlock(blockIndex), spec.subfolder);
}

async function fillClusterDeployment(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: ClusterDeploymentSpec
): Promise<void> {
  await wizard.expandClusterDeploymentSectionForRepositoryBlock(blockIndex);

  // Legacy placement-rule checkbox may be absent; false is applied via setCheckboxIfDefined (no blind setChecked).

  await setCheckboxIfDefined(
    wizard.getExistingPlacementRuleCheckboxInRepositoryBlock(blockIndex),
    spec.useExistingPlacementRule
  );

  if (spec.useExistingPlacementRule === true) {
    await fillIfDefined(
      wizard.getPlacementRuleComboInRepositoryBlock(blockIndex),
      spec.placementRuleComboText
    );
  }

  // Label placement is a PF Radio (`creation.app.settings.clusterSelector`); never use setChecked(false).
  if (spec.useClusterLabelSelector === true) {
    await wizard.clickClusterPlacementLabelSelectorRadio(blockIndex);
  }

  await setCheckboxIfDefined(
    wizard.getLocalClusterOnlyCheckboxForRepositoryBlock(blockIndex),
    spec.localClusterOnly
  );
  await setCheckboxIfDefined(
    wizard.getOnlineClustersOnlyCheckboxForRepositoryBlock(blockIndex),
    spec.onlineClustersOnly
  );

  if (spec.useClusterLabelSelector) {
    if (spec.clusterSet !== undefined && spec.clusterSet !== '') {
      await wizard.pickClusterSetMenuOptionForRepositoryBlock(blockIndex, spec.clusterSet);
    }
    const rows = spec.labelSelectorRows ?? [];
    for (let r = 0; r < rows.length; r++) {
      if (r > 0) {
        await wizard.getClusterPlacementAddAnotherLabelButtonForRepositoryBlock(blockIndex).click();
        await wizard.waitForLoad();
      }
      const row = rows[r]!;
      if (row.labelName !== undefined) {
        await wizard.pickClusterPlacementLabelNameMenuForRepositoryBlockRow(blockIndex, r, row.labelName);
      }
      await fillIfDefined(
        wizard.getClusterPlacementLabelOperatorComboboxForRowInRepositoryBlock(blockIndex, r),
        row.labelOperator
      );
      if (row.labelValue !== undefined) {
        await wizard.pickClusterPlacementLabelValueMenuForRepositoryBlockRow(blockIndex, r, row.labelValue);
      }
    }
  }
  await wizard.waitForLoad();
}

async function fillTimeWindow(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: TimeWindowSpec
): Promise<void> {
  await wizard.expandSettingsSectionForRepositoryBlock(blockIndex);
  if (spec.mode === 'default') {
    await wizard.getTimeWindowDefaultModeRadioForBlock(blockIndex).click();
    await wizard.waitForLoad();
    return;
  }
  if (spec.mode === 'active') {
    await wizard.getTimeWindowActiveModeRadioForBlock(blockIndex).click();
  } else if (spec.mode === 'blocked') {
    await wizard.getTimeWindowBlockedModeRadioForBlock(blockIndex).click();
  }
  // Mode selection expands the time-window accordion and enables the timezone control (`isDisabled={!mode}`).
  if (spec.timezone !== undefined) {
    await wizard.pickTimeWindowTimezoneMenuOptionForRepositoryBlock(blockIndex, spec.timezone);
  }
  if (spec.weekdays) {
    for (const [day, checked] of Object.entries(spec.weekdays)) {
      if (checked === undefined) continue;
      await wizard.getTimeWindowDayCheckbox(day, blockIndex).setChecked(!!checked);
    }
  }
  const ranges = spec.ranges ?? [];
  for (let i = 0; i < ranges.length; i++) {
    if (i > 0) {
      await wizard.getTimeWindowAddAnotherTimeRangeButton(blockIndex).click();
      await wizard.waitForLoad();
    }
    const range = ranges[i]!;
    await wizard.getTimeWindowStartTimeInput(i, blockIndex).fill(range.start);
    await wizard.getTimeWindowEndTimeInput(i, blockIndex).fill(range.end);
  }
  const extra = spec.extraTimeRangeRows ?? 0;
  for (let k = 0; k < extra; k++) {
    await wizard.getTimeWindowAddAnotherTimeRangeButton(blockIndex).click();
    await wizard.waitForLoad();
  }
  await wizard.waitForLoad();
}

async function fillAutomation(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: AutomationSpec
): Promise<void> {
  await wizard.expandConfigurePrePostAutomationSectionForRepositoryBlock(blockIndex);
  const block = wizard.getRepositoryBlockContainer(blockIndex);
  if (spec.credentialTypeFilter !== undefined) {
    await block
      .getByRole('combobox', {
        name: APP_SUBSCRIPTION_CREATE_WIZARD.automation.credentialTypeFilterComboboxAccessibleName,
      })
      .fill(spec.credentialTypeFilter);
  }
  if (spec.existingAnsibleSecret !== undefined) {
    await block
      .getByPlaceholder(APP_SUBSCRIPTION_CREATE_WIZARD.automation.existingSecretPlaceholder)
      .fill(spec.existingAnsibleSecret);
  }
  await wizard.waitForLoad();
}

async function applyPerBlockOptions(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  extras: PerBlockSubscriptionSpec | undefined
): Promise<void> {
  if (!extras) return;
  if (extras.clusterDeployment) {
    await fillClusterDeployment(wizard, blockIndex, extras.clusterDeployment);
  }
  if (extras.timeWindow) {
    await fillTimeWindow(wizard, blockIndex, extras.timeWindow);
  }
  if (extras.automation) {
    await fillAutomation(wizard, blockIndex, extras.automation);
  }
}

async function fillRepositoryBlockBySpec(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: SubscriptionRepositorySpec
): Promise<void> {
  await wizard.expandRepositoryTypesSectionForRepositoryBlock(blockIndex);
  await wizard.selectRepositoryTypeInBlock(blockIndex, spec.kind as SubscriptionWizardRepositoryCardKind);

  if (spec.kind === 'git') {
    await fillGitRepositoryBlock(wizard, blockIndex, spec);
  } else if (spec.kind === 'helm') {
    await fillHelmRepositoryBlock(wizard, blockIndex, spec);
  } else {
    await fillObjectStorageRepositoryBlock(wizard, blockIndex, spec);
  }

  await wizard.waitForLoad();
}

/**
 * Fills the subscription **create** wizard using {@link SubscriptionApplicationCreateWizardPage} building blocks.
 *
 * Covers for each repository block:
 * - **Channel:** Git / Helm / object storage (`data-testid` fields)
 * - **Cluster deployment / time window / automation** — only from {@link CreateSubscriptionOptions.perBlock} (e2e-spec-data YAML).
 * - **Settings: Specify application behavior** / time window (timezone **Choose a location**, weekdays, ranges)
 * - **Configure automation for prehook and posthook**
 *
 * Placement **Cluster sets** / label **Label** and **Value** use menu picks ({@link SubscriptionApplicationCreateWizardPage.pickOpenMenuItemByExactLabel}).
 *
 * **Before** the wizard, runs {@link OcCliService.applicationsAppK8sIoExists}: if the Application exists and
 * {@link CreateSubscriptionOptions.applicationExistsError} is **false** (default), skips the wizard and navigates to
 * **Details** for that app (so callers can run the same post-create checks). If it exists and **applicationExistsError**
 * is **true**, throws. If it does not exist, opens the wizard via
 * {@link SubscriptionApplicationCreateWizardPage.openFromApplicationsList} then fills and optionally submits.
 *
 * Callers should open the hub **Applications** list first (e.g. `await applicationListPage.goto()`), then call this
 * function. When the app is absent, {@link SubscriptionApplicationCreateWizardPage.openFromApplicationsList} runs
 * (it navigates to the list again before **Create application → Subscription**).
 *
 * Does not assert — callers own expectations (navigation after Create, toast, etc.).
 */
export async function createSubscription(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  options: CreateSubscriptionOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    repositories,
    perBlock,
    ensureFormMode = true,
    submit = true,
    applicationExistsError = false,
  } = options;

  if (!repositories?.length) {
    throw new Error(
      'createSubscription: `repositories` must be a non-empty array (define under e2e-spec-data blocks / subscription).'
    );
  }

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (exists) {
    if (applicationExistsError) {
      throw new Error(
        `createSubscription: Application "${applicationName}" already exists in namespace "${namespace}" ` +
          '(applications.app.k8s.io). Delete it or pick another name/namespace, or set applicationExistsError to ' +
          '`false` (default) to skip the wizard and open Details when the app is already present.'
      );
    }
    await wizard.gotoApplicationDetailsTab(namespace, applicationName);
    return;
  }

  await wizard.openFromApplicationsList(applicationListPage);

  if (ensureFormMode) {
    await wizard.collapseYamlEditor();
  }

  await wizard.getApplicationNameInput().fill(applicationName);

  const nsInput = wizard.getNamespaceInput();
  await nsInput.fill(namespace);
  await nsInput.press('Enter').catch(() => undefined);
  await wizard.waitForLoad();

  for (let blockIndex = 0; blockIndex < repositories.length; blockIndex++) {
    if (blockIndex > 0) {
      await wizard.getAddChannelsButton().click();
      await wizard.waitForLoad();
      await wizard.getRepositoryBlockContainer(blockIndex).waitFor({ state: 'visible', timeout: 60_000 });
    }

    const spec = repositories[blockIndex]!;
    await fillRepositoryBlockBySpec(wizard, blockIndex, spec);

    await applyPerBlockOptions(wizard, blockIndex, perBlock?.[blockIndex]);
  }

  if (submit) {
    const submitButton = wizard.getPrimarySubmitButton();
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    await submitButton.click();
    await wizard.waitForLoad();
  }
}

/**
 * Opens an existing subscription application in **Edit** mode, appends one or more repository blocks
 * (subscriptions), fills the new blocks, and optionally clicks **Update**.
 *
 * Unlike {@link createSubscription}, this requires the Application CR to already exist.
 */
export async function addSubscriptionToExistingApplication(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  options: AddSubscriptionToExistingApplicationOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    repositories,
    perBlock,
    ensureFormMode = true,
    submit = true,
    entry = 'list',
    expectedEditUrl,
    expectedPostSubmitUrl,
    expectedUrlTimeout = 120_000,
  } = options;

  if (!repositories?.length) {
    throw new Error(
      'addSubscriptionToExistingApplication: `repositories` must be a non-empty array (new blocks to append).'
    );
  }

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (!exists) {
    throw new Error(
      `addSubscriptionToExistingApplication: Application "${applicationName}" does not exist in namespace "${namespace}" ` +
        '(applications.app.k8s.io). Create it first before adding another subscription.'
    );
  }

  if (entry === 'details') {
    await wizard.openEditFromApplicationDetails(namespace, applicationName);
  } else {
    await wizard.openEditFromApplicationsList(applicationListPage, applicationName);
  }

  if (expectedEditUrl !== undefined) {
    await wizard.expectUrl(expectedEditUrl, { timeout: expectedUrlTimeout });
  } else {
    await wizard.expectOnEditSubscriptionUrl(namespace, applicationName, {
      timeout: expectedUrlTimeout,
    });
  }

  if (ensureFormMode) {
    await wizard.collapseYamlEditor();
  }

  const existingBlockCount = await wizard.getRepositoryBlockContainers().count();

  for (let addIndex = 0; addIndex < repositories.length; addIndex++) {
    const blockIndex = existingBlockCount + addIndex;
    await wizard.getAddChannelsButton().click();
    await wizard.waitForLoad();
    await wizard.getRepositoryBlockContainer(blockIndex).waitFor({ state: 'visible', timeout: 60_000 });

    const spec = repositories[addIndex]!;
    await fillRepositoryBlockBySpec(wizard, blockIndex, spec);
    await applyPerBlockOptions(wizard, blockIndex, perBlock?.[addIndex]);
  }

  if (submit) {
    const submitButton = wizard.getPrimarySubmitButton();
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    await submitButton.click();
    await wizard.waitForLoad();
    if (expectedPostSubmitUrl !== undefined) {
      await wizard.expectUrl(expectedPostSubmitUrl, { timeout: expectedUrlTimeout });
    } else if (entry === 'details') {
      await wizard.expectOnApplicationDetailsTabUrl(namespace, applicationName, {
        timeout: expectedUrlTimeout,
      });
    } else {
      await wizard.expectOnApplicationsListUrl({ timeout: expectedUrlTimeout });
    }
  }
}

export async function editSubscriptionInExistingApplication(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  options: EditSubscriptionInExistingApplicationOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    repositories,
    perBlock,
    ensureFormMode = true,
    submit = true,
    entry = 'details',
    expectedEditUrl,
    expectedPostSubmitUrl,
    expectedUrlTimeout = 120_000,
  } = options;

  if (!repositories?.length) {
    throw new Error(
      'editSubscriptionInExistingApplication: `repositories` must be a non-empty array (existing blocks to update).'
    );
  }

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (!exists) {
    throw new Error(
      `editSubscriptionInExistingApplication: Application "${applicationName}" does not exist in namespace "${namespace}" ` +
        '(applications.app.k8s.io). Create it first before editing.'
    );
  }

  if (entry === 'details') {
    await wizard.openEditFromApplicationDetails(namespace, applicationName);
  } else {
    await wizard.openEditFromApplicationsList(applicationListPage, applicationName);
  }

  if (expectedEditUrl !== undefined) {
    await wizard.expectUrl(expectedEditUrl, { timeout: expectedUrlTimeout });
  } else {
    await wizard.expectOnEditSubscriptionUrl(namespace, applicationName, {
      timeout: expectedUrlTimeout,
    });
  }

  if (ensureFormMode) {
    await wizard.collapseYamlEditor();
  }

  const existingBlockCount = await wizard.getRepositoryBlockContainers().count();
  if (repositories.length > existingBlockCount) {
    throw new Error(
      `editSubscriptionInExistingApplication: requested update for ${repositories.length} repository blocks, but only ${existingBlockCount} block(s) exist.`
    );
  }

  for (let blockIndex = 0; blockIndex < repositories.length; blockIndex++) {
    await wizard.getRepositoryBlockContainer(blockIndex).waitFor({ state: 'visible', timeout: 60_000 });
    const spec = repositories[blockIndex]!;
    await fillRepositoryBlockBySpec(wizard, blockIndex, spec);
    await applyPerBlockOptions(wizard, blockIndex, perBlock?.[blockIndex]);
  }

  if (submit) {
    const submitButton = wizard.getPrimarySubmitButton();
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    await submitButton.click();
    await wizard.waitForLoad();
    if (expectedPostSubmitUrl !== undefined) {
      await wizard.expectUrl(expectedPostSubmitUrl, { timeout: expectedUrlTimeout });
    } else if (entry === 'details') {
      await wizard.expectOnApplicationDetailsTabUrl(namespace, applicationName, {
        timeout: expectedUrlTimeout,
      });
    } else {
      await wizard.expectOnApplicationsListUrl({ timeout: expectedUrlTimeout });
    }
  }
}

/**
 * Opens an existing subscription application in **Edit** mode, deletes one repository block
 * (subscription), and optionally clicks **Update**.
 */
export async function deleteSubscriptionFromExistingApplication(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  options: DeleteSubscriptionFromExistingApplicationOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    deleteBlockIndex,
    ensureFormMode = true,
    submit = true,
    entry = 'details',
    expectedEditUrl,
    expectedPostSubmitUrl,
    expectedUrlTimeout = 120_000,
  } = options;

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (!exists) {
    throw new Error(
      `deleteSubscriptionFromExistingApplication: Application "${applicationName}" does not exist in namespace "${namespace}" ` +
        '(applications.app.k8s.io). Create it first before deleting a subscription.'
    );
  }

  if (entry === 'details') {
    await wizard.openEditFromApplicationDetails(namespace, applicationName);
  } else {
    await wizard.openEditFromApplicationsList(applicationListPage, applicationName);
  }

  if (expectedEditUrl !== undefined) {
    await wizard.expectUrl(expectedEditUrl, { timeout: expectedUrlTimeout });
  } else {
    await wizard.expectOnEditSubscriptionUrl(namespace, applicationName, {
      timeout: expectedUrlTimeout,
    });
  }

  if (ensureFormMode) {
    await wizard.collapseYamlEditor();
  }

  const beforeRepoCount = await wizard.getRepositoryBlockContainers().count();
  const beforeDeleteControls = await wizard.getDeleteRepositoryButtons().count();
  if (beforeRepoCount <= 1) {
    throw new Error(
      `deleteSubscriptionFromExistingApplication: expected at least 2 repository blocks, found ${beforeRepoCount}.`
    );
  }

  const blockIndex = deleteBlockIndex ?? beforeRepoCount - 1;
  if (blockIndex < 0 || blockIndex >= beforeRepoCount) {
    throw new Error(
      `deleteSubscriptionFromExistingApplication: deleteBlockIndex ${blockIndex} is out of range (0..${beforeRepoCount - 1}).`
    );
  }
  if (beforeDeleteControls < 1) {
    throw new Error(
      `deleteSubscriptionFromExistingApplication: expected at least one delete control, found ${beforeDeleteControls}.`
    );
  }

  let deleteControlIndex = blockIndex;
  // Some console variants do not render a delete control for the first repository.
  if (beforeDeleteControls === beforeRepoCount - 1) {
    if (blockIndex === 0) {
      throw new Error(
        'deleteSubscriptionFromExistingApplication: first repository block is not deletable in this UI variant.'
      );
    }
    deleteControlIndex = blockIndex - 1;
  } else if (deleteControlIndex >= beforeDeleteControls) {
    deleteControlIndex = beforeDeleteControls - 1;
  }

  const targetRepoSectionToggle = wizard.getRepositoryTypeSectionToggleInBlock(blockIndex);
  const targetRepoSectionCountBefore = await targetRepoSectionToggle.count();

  const deleteButton = wizard.getDeleteRepositoryButtons().nth(deleteControlIndex);
  await deleteButton.scrollIntoViewIfNeeded();
  await deleteButton.waitFor({ state: 'visible', timeout: 30_000 });
  await deleteButton.click();
  await wizard.waitForLoad();

  await expect
    .poll(async () => wizard.getRepositoryBlockContainers().count(), {
      timeout: 30_000,
      intervals: [500, 1_000, 2_000],
      message: `Expected repository blocks to decrease from ${beforeRepoCount} to ${beforeRepoCount - 1}`,
    })
    .toBe(beforeRepoCount - 1);

  if (targetRepoSectionCountBefore > 0) {
    await expect(targetRepoSectionToggle).toHaveCount(0, { timeout: 30_000 });
  }

  if (submit) {
    const submitButton = wizard.getPrimarySubmitButton();
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    await submitButton.click();
    await wizard.waitForLoad();
    if (expectedPostSubmitUrl !== undefined) {
      await wizard.expectUrl(expectedPostSubmitUrl, { timeout: expectedUrlTimeout });
    } else if (entry === 'details') {
      await wizard.expectOnApplicationDetailsTabUrl(namespace, applicationName, {
        timeout: expectedUrlTimeout,
      });
    } else {
      await wizard.expectOnApplicationsListUrl({ timeout: expectedUrlTimeout });
    }
  }
}
