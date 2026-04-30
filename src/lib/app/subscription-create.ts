/**
 * Subscription **create** wizard orchestration for **Playwright** tests only (`@playwright/test`,
 * {@link SubscriptionApplicationCreateWizardPage}). Does not use Cypress. For exploratory hub verification,
 * use the **Playwriter** CLI against your logged-in Chrome session.
 */
import type { Locator } from '@playwright/test';
import {
  APP_SUBSCRIPTION_CREATE_WIZARD,
  type AppSubscriptionTimeWindowWeekday,
  type SubscriptionWizardRepositoryCardKind,
} from '@constants/app';
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
   * **Value** — menu pick when set (e.g. `local-cluster`), same as legacy Cypress subscription flows.
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
   * Skip `oc get applications.app.k8s.io` preflight (same name/namespace). Default **false** — duplicate
   * Application CRs fail late in the UI; preflight fails fast with a clear error.
   */
  skipExistingApplicationCheck?: boolean;
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
 * **Before** filling the form (unless {@link CreateSubscriptionOptions.skipExistingApplicationCheck}), runs
 * `OcCliService#applicationsAppK8sIoExists` so a duplicate **Application** (`applications.app.k8s.io`) is
 * rejected with an explicit error instead of a vague console failure.
 *
 * Does not assert — callers own expectations (navigation after Create, toast, etc.).
 */
export async function createSubscription(
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
    skipExistingApplicationCheck = false,
  } = options;

  if (!repositories?.length) {
    throw new Error(
      'createSubscription: `repositories` must be a non-empty array (define under e2e-spec-data blocks / subscription).'
    );
  }

  if (!skipExistingApplicationCheck) {
    const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
    if (exists) {
      throw new Error(
        `createSubscription: Application "${applicationName}" already exists in namespace "${namespace}" ` +
          '(applications.app.k8s.io). Delete it or pick another name/namespace, or set skipExistingApplicationCheck.'
      );
    }
  }

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

    await applyPerBlockOptions(wizard, blockIndex, perBlock?.[blockIndex]);
  }

  if (submit) {
    await wizard.getCreateButton().click();
    await wizard.waitForLoad();
  }
}
