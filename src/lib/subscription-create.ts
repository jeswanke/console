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
import { SAMPLE_APPLICATION_LIFECYCLE_GIT_URL } from '@constants/sampleRepos';
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
  mode?: 'active' | 'blocked';
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
  /**
   * Repository blocks in order (`0` = first). Defaults to a single Git example when omitted
   * (override for real runs).
   */
  repositories?: SubscriptionRepositorySpec[];
  /**
   * Optional **cluster deployment**, **settings / time window**, and **automation** per repository block
   * (`perBlock[i]` lines up with `repositories[i]`). Applied after channel fields for that block.
   * When {@link fillEntireWizard} is `true`, merged with {@link DEFAULT_FULL_WIZARD_PER_BLOCK} (override wins per field).
   */
  perBlock?: (PerBlockSubscriptionSpec | undefined)[];
  /**
   * When `true` (default), after each channel block fills **Select clusters**, **Specify application behavior** (time window),
   * and **Configure automation** using {@link DEFAULT_FULL_WIZARD_PER_BLOCK} plus any {@link perBlock} merge.
   * Set `false` to only fill repository channels unless you pass explicit {@link perBlock} entries.
   */
  fillEntireWizard?: boolean;
  /** Call {@link SubscriptionApplicationCreateWizardPage.collapseYamlEditor} first (default `true`) */
  ensureFormMode?: boolean;
  /** Click primary **Create** when done (default `true`) */
  submit?: boolean;
}

const defaultRepositories: SubscriptionRepositorySpec[] = [
  {
    kind: 'git',
    url: SAMPLE_APPLICATION_LIFECYCLE_GIT_URL,
    branch: 'main',
    path: 'helloworld',
  },
];

/**
 * Default **per repository block** when {@link CreateSubscriptionOptions.fillEntireWizard} is `true`: cluster label
 * placement (`global` cluster set + `name` / `local-cluster`), active Monday window, Ansible filter.
 * Override pieces via {@link CreateSubscriptionOptions.perBlock}. Aligns with legacy Cypress `editDeployOnLocal`-style flows.
 */
export const DEFAULT_FULL_WIZARD_PER_BLOCK: PerBlockSubscriptionSpec = {
  clusterDeployment: {
    useExistingPlacementRule: false,
    useClusterLabelSelector: true,
    clusterSet: 'global',
    labelSelectorRows: [{ labelName: 'name', labelValue: 'local-cluster' }],
  },
  timeWindow: {
    mode: 'active',
    weekdays: { Monday: true },
    ranges: [{ start: '09:00 AM', end: '05:00 PM' }],
  },
  automation: {
    credentialTypeFilter: 'Ansible',
  },
};

function mergePerBlockSpec(
  defaults: PerBlockSubscriptionSpec,
  override: PerBlockSubscriptionSpec | undefined
): PerBlockSubscriptionSpec {
  const o = override ?? {};
  return {
    clusterDeployment: { ...defaults.clusterDeployment, ...o.clusterDeployment },
    timeWindow: {
      ...defaults.timeWindow,
      ...o.timeWindow,
      weekdays: { ...defaults.timeWindow?.weekdays, ...o.timeWindow?.weekdays },
    },
    automation: { ...defaults.automation, ...o.automation },
  };
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

  if (spec.useClusterLabelSelector === true && spec.useExistingPlacementRule !== true) {
    await wizard.getExistingPlacementRuleCheckboxInRepositoryBlock(blockIndex).setChecked(false);
  }

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
  if (spec.mode === 'active') {
    await wizard.getTimeWindowActiveModeRadioForBlock(blockIndex).click();
  } else if (spec.mode === 'blocked') {
    await wizard.getTimeWindowBlockedModeRadioForBlock(blockIndex).click();
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
 * - **Select clusters for application deployment** — when {@link CreateSubscriptionOptions.fillEntireWizard} is `true`
 *   (default), uses {@link DEFAULT_FULL_WIZARD_PER_BLOCK} (cluster set + label menu picks); override via {@link CreateSubscriptionOptions.perBlock}.
 * - **Settings: Specify application behavior** / time window
 * - **Configure automation for prehook and posthook**
 *
 * Placement **Cluster sets** / label **Label** and **Value** use menu picks ({@link SubscriptionApplicationCreateWizardPage.pickOpenMenuItemByExactLabel}).
 * Does not assert — callers own expectations (navigation after Create, toast, etc.).
 */
export async function createSubscription(
  wizard: SubscriptionApplicationCreateWizardPage,
  options: CreateSubscriptionOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    repositories = defaultRepositories,
    perBlock,
    fillEntireWizard = true,
    ensureFormMode = true,
    submit = true,
  } = options;

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

    const mergedPerBlock =
      fillEntireWizard === true
        ? mergePerBlockSpec(DEFAULT_FULL_WIZARD_PER_BLOCK, perBlock?.[blockIndex])
        : perBlock?.[blockIndex];
    await applyPerBlockOptions(wizard, blockIndex, mergedPerBlock);
  }

  if (submit) {
    await wizard.getCreateButton().click();
    await wizard.waitForLoad();
  }
}
