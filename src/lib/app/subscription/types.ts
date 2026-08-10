/**
 * Subscription wizard domain types (config-safe — no Playwright or page imports).
 */

import type { AppSubscriptionTimeWindowWeekday } from '@constants/app';

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
  /**
   * **Values** — multi-select in one menu session. When set, takes precedence over {@link labelValue}.
   */
  labelValues?: string[];
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

export interface AddCredentialWizardSpec {
  secretName: string;
  secretNamespace: string;
  /** Merged from `ANSIBLE_URL` at runtime via {@link applyAnsibleAapAuthToSubscriptionOptions}. */
  ansibleHost?: string;
  /** Merged from `ANSIBLE_TOKEN` at runtime. */
  ansibleToken?: string;
}

export interface AutomationSpec {
  /** **Type to filter** — Ansible credential category combobox */
  credentialTypeFilter?: string;
  /** Existing secret placeholder field (after a template is chosen in the filter) */
  existingAnsibleSecret?: string;
  /** Create a new Tower/AAP secret via the **Add credential** modal (RHACM4K-20541). */
  addCredentialWizard?: AddCredentialWizardSpec;
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
