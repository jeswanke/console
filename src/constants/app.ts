/** ALC routes and UI strings (from live hub / Playwriter snapshots). */

import { PLACEMENT_TOLERATIONS_YAML_PATTERNS } from '@constants/placement-tolerations';

// =============================================================================
// Routes
// =============================================================================

export const APP_ROUTES = {
  list: '/multicloud/applications',
  /** Advanced configuration tab (secondary nav) */
  advanced: '/multicloud/applications/advanced',
  /** Create application → Argo CD ApplicationSet - Push model */
  createArgoPush: '/multicloud/applications/create/argo',
  /** Create application → Argo CD ApplicationSet - Pull model */
  createArgoPull: '/multicloud/applications/create/argopullmodel',
  /** Base details path (no tab segment). */
  details: (namespace: string, name: string) =>
    `/multicloud/applications/details/${namespace}/${name}`,
  detailsTab: (namespace: string, name: string, tabSlug: AppApplicationDetailsTabSlug) =>
    `/multicloud/applications/details/${namespace}/${name}/${tabSlug}`,
  /** Post–create push-model ApplicationSet details (hub default: Topology tab). */
  argoPushTopology: (argoServerNamespace: string, applicationSetName: string) =>
    `${APP_ROUTES.detailsTab(argoServerNamespace, applicationSetName, APP_APPLICATION_DETAILS.tabs.topology.slug)}?apiVersion=applicationset.argoproj.io`,
} as const;

/** URL path segment for {@link APP_ROUTES.detailsTab} (lowercase, matches console router). */
export type AppApplicationDetailsTabSlug =
  (typeof APP_APPLICATION_DETAILS.tabs)[keyof typeof APP_APPLICATION_DETAILS.tabs]['slug'];

/** Subscription app details tabs and DescriptionList terms. */
export const APP_APPLICATION_DETAILS = {
  tabs: {
    topology: { label: 'Topology', slug: 'topology' as const },
    details: { label: 'Details', slug: 'details' as const },
  },
  /** `role="term"` labels on the Details tab (PatternFly DescriptionList). */
  descriptionTerms: {
    name: 'Name',
    type: 'Type',
    namespace: 'Namespace',
    clusters: 'Clusters',
    repository: 'Repository',
    clusterResourceStatus: 'Cluster resource status',
    created: 'Created',
    lastSyncRequested: 'Last sync requested',
    placement: 'Placement',
  },
  /** Subscription row value observed for **Type** on Details. */
  typeValues: {
    subscription: 'Subscription',
    applicationSetPush: 'Application set - Push model',
  },
  /** ApplicationSet details URL query (`?apiVersion=applicationset.argoproj.io`). */
  applicationSetApiVersionQuery: 'apiVersion=applicationset.argoproj.io',
  /** Repository kind badges/buttons shown inside Details → Repository value and Advanced → Channels **Type** label. */
  repositoryKindLabels: {
    git: 'Git',
    helm: 'Helm',
    objectStorage: 'Object storage',
  },
  /** Details → Last sync requested row action anchor id. */
  syncActionAnchorId: 'sync-app',
  /** Breadcrumb link back to the Applications list. */
  breadcrumb: {
    applications: 'Applications',
  },
} as const;

export type AppApplicationDetailsTabKey = keyof typeof APP_APPLICATION_DETAILS.tabs;

/**
 * Subscription app **Sync** from Details → **Last sync requested** (`#sync-app` → confirm modal).
 * Modal container id is shared with delete flows on the hub (`#remove-resource-modal`).
 */
export const APP_APPLICATION_SYNC = {
  modalSelector: '#remove-resource-modal',
  modalTitle: 'Sync application',
  confirmButtonLabel: 'Synchronize',
} as const;

/**
 * Application **Topology** tab: graph chrome (zoom / fit / reset), legend help, secondary tabs wrapper.
 * Captured from live hub (`…/details/{namespace}/{name}/topology`, en).
 *
 * **Graph nodes** (subscriptions, channels, deployments, …) use **app-generated** labels and ids; keep those
 * out of this object except where the console exposes a **stable element id** on a recurring shape (see
 * {@link APP_APPLICATION_TOPOLOGY.graphElementIds}). Prefer {@link ApplicationDetailsPage} `getTopologyNodeButtonByName`
 * and tabpanel scoping for assertions.
 */
export const APP_APPLICATION_TOPOLOGY = {
  /**
   * **`data-test-id`** on the PF topology visualization surface wrapping the `svg` graph (`g[data-kind=node]`,
   * `data-id` values — see `src/lib/app/topology/graph-ids.ts` / Playwriter hub capture).
   */
  graphSurfaceTestId: 'topology',
  /** Topology / Details tab list lives in this labelled region (PF). */
  secondaryNavAccessibleName: 'Secondary page navigation tabs',
  /** Topology canvas toolbar button `id`s (stable on observed hub). */
  controlIds: {
    zoomIn: 'zoom-in',
    zoomOut: 'zoom-out',
    fitToScreen: 'fit-to-screen',
    resetView: 'reset-view',
  },
  /** Opens topology legend / how-to-read guidance. */
  howToReadTopologyButtonName: 'How to read topology',
  /**
   * Stable **`id`s on topology graph elements** when present (subscription app graph, qe6). Other nodes may be
   * text-only inside SVG — use role + name from your scenario, not hard-coded constants.
   */
  graphElementIds: {
    /**
     * PF6 **MenuToggle** for topology **subscription scope** (`All Subscriptions` vs each Subscription CR name).
     * Rendered only when the application has **more than one** subscription/repo; absent on single-repo topology.
     * Same element historically called “channel combo” (Playwriter / PF6 hub).
     */
    channelCombo: 'comboChannel',
  },
  /** `menuitem` label when opening {@link APP_APPLICATION_TOPOLOGY.graphElementIds.channelCombo}. */
  subscriptionScopeMenuItemAll: 'All Subscriptions',
  /**
   * **PlacementDecision** topology drawer field labels.
   * @see {@link expectTopologyDrawerLabeledField}
   */
  placementDrawer: {
    matchedClusters: 'Matched Clusters',
    clusterSet: 'ClusterSet',
    labelSelector: 'LabelSelector',
  },
} as const;

// =============================================================================
// Documentation URLs (View documentation links)
// =============================================================================

export const APP_DOCS = {
  /** Example URL; shipped console uses the docs minor matching the ACM version (2.16, 2.17, …). */
  applicationsManaging:
    'https://docs.redhat.com/en/documentation/red_hat_advanced_cluster_management_for_kubernetes/2.16/html-single/applications/index#managing-applications',
} as const;

/** Use in assertions: href must be managing-applications docs with any 2.x product version. */
export const APP_DOCS_MANAGING_APPLICATIONS_HREF_RE =
  /^https:\/\/docs\.redhat\.com\/en\/documentation\/red_hat_advanced_cluster_management_for_kubernetes\/2\.\d+\/html-single\/applications\/index#managing-applications$/;

/**
 * "Learn more" on the Advanced configuration **page deprecation** banner (RHACM4K-63573).
 * Matches live hub: release notes → deprecations-removals-acm (not managing-applications).
 */
export const APP_DOCS_ADVANCED_DEPRECATION_HREF_RE =
  /^https:\/\/docs\.redhat\.com\/en\/documentation\/red_hat_advanced_cluster_management_for_kubernetes\/2\.\d+\/html-single\/release_notes\/release-notes#deprecations-removals-acm$/;

/**
 * **Placement rule deprecation** inline alert in the subscription wizard (cluster placement section).
 * Matches `ViewDocumentationLink` / `DOC_LINKS.DEPRECATIONS_ACM` from the console.
 */
export const APP_DOCS_ACM_DEPRECATIONS_RELEASE_NOTES_HREF_RE =
  /^https:\/\/docs\.redhat\.com\/en\/documentation\/red_hat_advanced_cluster_management_for_kubernetes\/2\.\d+\/html-single\/release_notes\/release-notes#deprecations-removals-acm$/;

// =============================================================================
// Page structure
// =============================================================================

export const APP_PAGE = {
  title: 'Applications',
  /** Secondary tabs on the Applications main page */
  tabs: {
    overview: 'Overview',
    advancedConfig: 'Advanced configuration',
  },
} as const;

// =============================================================================
// Toolbar (IDs and labels from DOM)
// =============================================================================

export const APP_TOOLBAR = {
  /** Create application dropdown button */
  createButtonId: 'application-create',
  createButtonLabel: 'Create application',
  /** Advanced search input container id */
  searchContainerId: 'custom-advanced-search',
  searchPlaceholder: 'Search',
  searchInputAriaLabel: 'Search input',
  /** Filter menu toggle */
  filterButtonId: 'acm-table-filter-select-undefined',
  filterLabel: 'Filter',
  /** Export results */
  exportButtonId: 'export-search-result',
  exportButtonAriaLabel: 'export-search-result',
  /** Compare application types link */
  compareTypesLabel: 'Compare application types',
  /**
   * PF link **Clear all filters** on the Applications table toolbar (shown when filters are active).
   * Validated with Playwriter on `multicloud/applications` (PF6 `role="button"`).
   */
  clearAllFiltersButtonName: 'Clear all filters',
} as const;

/** Create application dropdown. Open panel uses role="menu". */
export const APP_CREATE_MENU = {
  /** Button id and label; when open, aria-expanded="true" */
  buttonId: APP_TOOLBAR.createButtonId,
  buttonLabel: APP_TOOLBAR.createButtonLabel,
  /** Open panel uses role="menu". */
  menuRole: 'menu' as const,
  /** Disabled group label (not selectable). */
  groupLabel: 'Choose a type',
  /** Menu item labels and ids (from Create application dropdown). */
  options: {
    /** Argo CD ApplicationSet - Pull model (managed clusters pull from Git). */
    argoPullModel: 'Argo CD ApplicationSet - Pull model',
    /** Argo CD ApplicationSet - Push model (hub pushes to managed clusters). */
    argoPushModel: 'Argo CD ApplicationSet - Push model',
    /** Subscription (Deprecated). */
    subscription: 'Subscription',
  },
  /** Stable DOM ids for menu item buttons (use for locators when text may change). */
  optionIds: {
    argoPullModel: 'create-argo-pull-model',
    argoPushModel: 'create-argo',
    subscription: 'create-subscription',
  },
  /** Description text under each menu option (secondary line under the action). */
  optionDescriptions: {
    argoPullModel:
      'Considered the better choice for security although you cannot deploy to hub cluster. Managed clusters pull application resources directly from Git repositories.',
    argoPushModel:
      'Hub cluster pushes application resources to managed clusters requiring credentials for each cluster.',
    subscription: '',
  },
  /** Label shown next to Subscription option (e.g. deprecated badge). */
  subscriptionDeprecatedLabel: 'Deprecated',
} as const;

/** Compare application types panel (typically role="dialog"). Opened by Compare application types button. */
export const APP_COMPARE_POPOVER = {
  /** Popover title (h6 in header). */
  title: 'Compare application types',
  /** Close button in popover header. */
  closeButtonLabel: 'Close',
  /** Description text for each type in the popover body (longer than Create menu descriptions). */
  typeDescriptions: {
    argoPullModel:
      'ApplicationSet application where Argo CD application resources are distributed from the hub cluster to the managed clusters. Each managed cluster independently reconciles and deploys the application by using the received application resource.',
    argoPushModel:
      'ApplicationSet application where Argo CD application resources are created on the hub cluster. The hub cluster is responsible for reconciling and pushing the deployed application to the managed clusters.',
    subscription:
      'Subscription application where subscription resources are distributed from the hub cluster to the managed clusters. Each managed cluster independently reconciles and deploys the application using the received subscription resource.',
  },
} as const;

// =============================================================================
// Table
// =============================================================================

export const APP_TABLE = {
  ariaLabel: 'Simple Table',
  role: 'grid' as const,
  /** Pagination */
  paginationTopId: 'options-menu-top-pagination',
  paginationBottomId: 'options-menu-bottom-pagination',
  paginationAriaLabelTop: 'Pagination top',
  paginationAriaLabelBottom: 'Pagination bottom',
} as const;

/** Column headers (data-label on th / text in header) */
export const APP_TABLE_COLUMNS = {
  name: 'Name',
  type: 'Type',
  namespace: 'Namespace',
  clusters: 'Clusters',
  labels: 'Labels',
  healthStatus: 'Health Status',
  syncStatus: 'Sync Status',
  podStatus: 'Pod Status',
  created: 'Created',
} as const;

/** Overview table **Manage columns** dialog defaults (RHACM4K-63768). */
export const APP_TABLE_MANAGE_COLUMNS = {
  /** Hidden until enabled in the dialog. */
  defaultUnchecked: [APP_TABLE_COLUMNS.created] as const,
  /** Required columns — checkbox disabled in the dialog. */
  required: [APP_TABLE_COLUMNS.name, APP_TABLE_COLUMNS.namespace, APP_TABLE_COLUMNS.clusters] as const,
  /** Optional columns — can be toggled off. */
  optional: [
    APP_TABLE_COLUMNS.type,
    APP_TABLE_COLUMNS.labels,
    APP_TABLE_COLUMNS.healthStatus,
    APP_TABLE_COLUMNS.syncStatus,
    APP_TABLE_COLUMNS.podStatus,
  ] as const,
} as const;

/** RHACM4K-64215 — pre-seeded Placement + legacy PlacementRule for subscription wizard. */
export const PLACEMENT_TEST_RESOURCES = {
  namespace: 'placement-test-ns',
  applicationName: 'placement-wizard-test',
  placementName: 'placement-test-placement-1',
  legacyPlacementRuleName: 'test-legacy-placementrule',
  setupYamlRelativePath: 'src/templates/app/subscription/existing-placement-wizard-setup.yaml',
} as const;

/** Row action kebab (Overview table); menu items vary by application kind (see Overview rowActionResolver). */
export const APP_TABLE_ROW_ACTIONS = {
  actionsAriaLabel: 'Actions',
  /** At least one of these menuitem labels is expected when the row actions menu opens. */
  menuItemLabels: ['View application', 'Search application'] as const,
} as const;

/**
 * Delete application from the Applications **Overview** table (row kebab → modal).
 */
export const APP_APPLICATION_DELETE = {
  modalSelector: '#remove-resource-modal',
  /** Also remove application-related resources before confirming delete. */
  removeRelatedResourcesSelector: '#remove-app-resources',
} as const;

/** Overview table column help popovers (click help control next to column header). */
export const APP_TABLE_COLUMN_HELP = {
  viewDocsLinkText: 'View documentation',
  viewDocsHref: APP_DOCS.applicationsManaging,
  closeButtonLabel: 'Close',
  /** Column data-label -> popover body description (matches Overview.tsx tooltips; Type may include View documentation link). */
  columns: {
    Type: 'Displays the type of the application.',
    Namespace:
      'Displays the namespace of the application resource, which by default is where the application deploys other resources. For Argo applications, this is the destination namespace.',
    Clusters:
      'For Subscription applications, displays the number of remote and local clusters where resources for the application are deployed. For Argo applications, this is the name of the destination cluster. For OpenShift applications, this is the cluster where the application is deployed.',
    /** Present on some hubs; column-help test skips if header missing. */
    Repository: 'Provides links to each of the resource repositories used by the application.',
    'Health Status': 'Health status for ArgoCD applications.',
    'Sync Status': 'Sync status for ArgoCD applications.',
    /** Extension column on many hubs (`th[data-label="Pod Status"]`). */
    'Pod Status': 'Status of pods deployed by the application.',
  },
} as const;

export type AppTableColumnHelpKey = keyof typeof APP_TABLE_COLUMN_HELP.columns;

// =============================================================================
// Filter dropdown (opened by Filter toolbar button)
// =============================================================================

/** Filter menu opened when clicking the Filter button */
export const APP_FILTER = {
  /** aria-label on the open menu container */
  menuAriaLabel: 'acm-table-filter-select-key',
  /** Section titles inside the filter menu */
  groupTitles: {
    type: 'Type',
    cluster: 'Cluster',
  },
  /** Known Type filter option labels (checkbox accessible names often include counts, e.g. `System 3`). */
  typeOptions: {
    system: 'System',
    openshift: 'OpenShift',
    /** Subscription / ALC Git apps. */
    subscription: 'Subscription',
  },
} as const;

// =============================================================================
// Advanced Configuration tab: **Subscriptions** and **Channels** toggles only (`#subscriptions`, `#channels`).
// Placements and Placement rules UIs were removed from this page (see deprecation; use Infrastructure / app views).
// =============================================================================

/** Terminology card and resource-type toggle (Advanced configuration tab only). */
export const APP_ADVANCED_CONFIG = {
  /**
   * Inline alert above Advanced content (PF Alert). Copy captured from live hub (Playwriter, Advanced tab).
   * Omit on consoles that have not shipped this banner yet.
   */
  deprecationBanner: {
    alertTitle: 'Page deprecation',
    bodySnippets: {
      deprecatedLabel: /Deprecated:/i,
      placementsManagedFromInfrastructure:
        /Placements are managed from the Placements tab of the Infrastructure page/i,
      selectInfrastructurePlacementsPath: /Select Infrastructure > Clusters > Placements/i,
      placementDetailsInApps:
        /view placement details directly within individual applications or policies/i,
    },
    learnMoreLinkName: 'Learn more',
  },
  /** Expandable card id and title */
  terminologyCard: {
    id: 'ApplicationDeploymentHighlightsTerminology',
    title: 'Learn more about the terminology',
    /** Sub-card titles in the expandable section */
    termTitles: {
      subscriptions: 'Subscriptions',
      channels: 'Channels',
    },
    /** RHACM4K-63573 — Placements term removed from the terminology card. */
    removedPlacementsTermTitlePattern: /^Placements$/i,
    /** RHACM4K-64170 — PlacementRule(s) term removed from the terminology card. */
    removedTermTitlePattern: /Placement\s*Rules?/i,
    /** Deprecated label shown next to some terms */
    deprecatedLabel: 'Deprecated',
    viewDocsLinkText: 'View documentation',
    viewDocsHref: APP_DOCS.applicationsManaging,
  },
  /** Resource type filter toggle group. Button ids from DOM. */
  resourceToggle: {
    ids: {
      subscriptions: 'subscriptions',
      channels: 'channels',
    },
    labels: {
      subscriptions: 'Subscriptions',
      channels: 'Channels',
    },
    /** RHACM4K-63573 — legacy Placements toggle id if the console still emits a hidden control. */
    removedPlacementsToggleIds: ['placements'] as const,
    /** RHACM4K-63573 — removed Placements sub-tab label. */
    removedPlacementsTabLabelPattern: /^Placements$/i,
    /** RHACM4K-64170 — legacy PlacementRule toggle ids if the console still emits hidden controls. */
    removedToggleIds: ['placementrules', 'placement-rules'] as const,
    /** RHACM4K-64170 — removed PlacementRule sub-tab label. */
    removedTabLabelPattern: /Placement\s*Rules?/i,
  },
  /** Same toolbar search/export/pagination ids as Overview; table uses APP_TABLE. */
  /** Empty state (when no resources). Verify title, body, and actions. */
  emptyState: {
    /** Common Advanced subscriptions empty body. */
    body: 'To get started, create an application.',
    /** Some locales / builds use i18n subtitle instead. */
    bodyAltPattern: /Click\s+Create application.*create your resource/i,
    createApplicationLabel: 'Create application',
    /** h4 titles vary (e.g. "...subscriptions" vs "...subscriptions yet"). */
    titlePatterns: {
      subscriptions: /don't have any subscriptions/i,
      channels: /don't have any channels/i,
    },
  },
} as const;

/** oc resource names for Advanced config views (for "oc get <resource> -A"). */
export const APP_ADVANCED_OC_RESOURCES: Record<
  keyof typeof APP_ADVANCED_CONFIG.resourceToggle.ids,
  string
> = {
  subscriptions: 'subscriptions.apps.open-cluster-management.io',
  channels: 'channels.apps.open-cluster-management.io',
};

/** Advanced config table columns – Subscriptions view. */
export const APP_ADVANCED_TABLE_COLUMNS = {
  name: 'Name',
  namespace: 'Namespace',
  channel: 'Channel',
  applications: 'Applications',
  clusters: 'Clusters',
  timeWindow: 'Time window',
  created: 'Created',
} as const;

/** Advanced config table columns – Channels view (no Channel/Applications/Time window; has Type, Subscriptions). */
export const APP_ADVANCED_TABLE_COLUMNS_CHANNELS = {
  name: 'Name',
  namespace: 'Namespace',
  type: 'Type',
  subscriptions: 'Subscriptions',
  clusters: 'Clusters',
  created: 'Created',
} as const;

// =============================================================================
// Argo CD ApplicationSet create wizards (pull + push)
// =============================================================================
//
// **Live hub (Playwriter):** PF Form Wizard — `nav[aria-label="Argo application steps"]`, six steps,
// split YAML panel (`#yaml-switch`, Copy `#copy-button`). Path-based field ids — prefer placeholders
// and combobox accessible names.
// =============================================================================

/** Shared chrome for pull and push ApplicationSet create wizards. */
export const APP_ARGO_CREATE_WIZARD_SHARED = {
  navAccessibleName: 'Argo application steps',
  steps: {
    general: 'general',
    generators: 'generators',
    template: 'repository',
    syncPolicy: 'sync-policy',
    placement: 'placement',
    review: 'review-step',
  } as const,
  stepLabels: {
    general: 'General',
    generators: 'Generators',
    template: 'Template',
    syncPolicy: 'Sync policy',
    placement: 'Placement',
    review: 'Review',
  } as const,
  footer: {
    next: 'Next',
    back: 'Back',
    cancel: 'Cancel',
    submit: 'Submit',
  },
  yamlSwitchId: 'yaml-switch',
  syncCheckboxSuffixIds: {
    pruneLast: 'prune-last',
    replace: 'replace',
    applyOutOfSyncOnly: 'apply-out-of-sync-only',
    createNamespace: 'create-namespace',
    validate: 'validate',
    propagationPolicy: 'propagation-policy',
  },
  general: {
    nameInputIdSuffix: ';id=name',
    namePlaceholder: 'Enter the application set name',
    argoServerComboboxLabel: 'Select the Argo server',
    addArgoServerButtonLabel: 'Add Argo Server',
    requeueTimeComboboxLabel: 'Select the requeue time',
  },
  template: {
    gitRepositoryTypeCardText: 'Git',
    helmRepositoryTypeCardText: 'Helm',
    gitUrlComboboxLabel: 'Enter or select a Git URL',
    gitRevisionComboboxLabel: 'Enter or select a tracking revision',
    gitPathComboboxLabel: 'Enter or select a repository path',
    destinationNamespacePlaceholder: 'Enter the destination namespace',
    destinationInputIdSuffix: ';id=destination',
    /** RHACM4K-63608: info alert on **Template** when using push-model ApplicationSet wizard. */
    privateRepoCredentialsAlert: {
      title: 'Private repository credentials required',
      messageSnippet:
        'When using private repositories, credentials are required on the hub cluster to create an application set push model type.',
      configureCredentialsButtonLabel: 'Configure repository credentials',
      /** Argo CD server settings path opened from the alert action (host is cluster-specific). */
      gitOpsRepoSettingsPathSuffix: '/settings/repos',
    },
  },
  placement: {
    clusterSetsComboboxLabel: 'Select the cluster sets',
    newPlacementButtonLabel: 'New placement',
    existingPlacementButtonLabel: 'Existing placement',
    addLabelExpressionButtonLabel: 'Add label expression',
    addLabelExpressionButtonAriaLabel: 'Action',
    labelExpressionsRegionLabel: 'Label expressions',
    labelComboboxLabel: /Select the label/i,
    operatorButtonLabel: /equals any of|does not equal any of|exists|does not exist/i,
    operatorComboboxLabel: /Select the operator/i,
    valuesComboboxLabel: /Select the values/i,
    operatorInMenuLabel: /equals any of/i,
  },
  review: {
    panelId: 'review',
    searchPlaceholder: 'Search review details',
    collapseAllButtonLabel: 'Collapse all',
    expandAllButtonLabel: 'Expand all',
    highlightYamlButtonLabel: 'Highlight in YAML',
    editFieldButtonLabel: 'Edit',
    reviewRowClass: 'wizard-review-pen-hover-zone',
    editButtonClass: 'wizard-review-edit-btn',
    syncEditorContainerSelector: '.sync-editor__container',
    syncEditorMonacoTextareaSelector: '.monaco-editor textarea.inputarea',
    syncEditorToolbarSearchButtonId: 'search-button',
    expandableSectionClass: 'wizard-review-expandable-section',
    sectionIds: {
      General: 'general',
      Generators: 'generators',
      Template: 'repository',
      'Sync policy': 'sync-policy',
      Placement: 'placement',
    },
    monacoFoldExpandedSelector: '.monaco-editor .codicon-folding-expanded',
  },
  /** Add Argo server modal — GitOps form only; Placement tolerations in multi-doc YAML (modal Copy). */
  addArgoServerModal: {
    titlePattern: /Add Argo Server/i,
    cancelButtonLabel: 'Cancel',
    modalSelector: '.pf-v6-c-modal-box',
  },
  postSubmitOverviewQuery: 'apiVersion=applicationset.argoproj.io',
} as const;

/** Shared RHACM4K-61724 YAML patterns (pull + push); modal uses GitOpsCluster from CreateArgoResources. */
const APP_ARGO_PLACEMENT_TOLERATIONS_YAML_PATTERNS = {
  modalGitOpsPlacementTolerations:
    /kind:\s*GitOpsCluster[\s\S]*kind:\s*Placement[\s\S]*tolerations:[\s\S]*cluster\.open-cluster-management\.io\/unreachable[\s\S]*operator:\s*Exists[\s\S]*cluster\.open-cluster-management\.io\/unavailable[\s\S]*operator:\s*Exists[\s\S]*clusterSets:\s*\n\s*-\s*default/,
  wizardApplicationSetPlacementTolerations:
    /kind:\s*ApplicationSet[\s\S]*kind:\s*Placement[\s\S]*tolerations:[\s\S]*cluster\.open-cluster-management\.io\/unreachable[\s\S]*operator:\s*Exists[\s\S]*cluster\.open-cluster-management\.io\/unavailable[\s\S]*operator:\s*Exists/,
  wizardNumberOfClusters: /numberOfClusters:\s*1/,
  ...PLACEMENT_TOLERATIONS_YAML_PATTERNS,
} as const;

export const APP_ARGO_PUSH_CREATE_WIZARD = {
  ...APP_ARGO_CREATE_WIZARD_SHARED,
  routePath: '/multicloud/applications/create/argo',
  pageTitle: 'Create application set - push model',
  yamlPatterns: {
    ...APP_ARGO_PLACEMENT_TOLERATIONS_YAML_PATTERNS,
    /** Manual testcase: predicates exclude local-cluster by name label. */
    placementPredicate:
      /kind:\s*Placement[\s\S]*predicates:[\s\S]*key:\s*name[\s\S]*operator:\s*NotIn[\s\S]*local-cluster/,
  },
} as const;

export type AppArgoPushCreateWizardStepId =
  (typeof APP_ARGO_PUSH_CREATE_WIZARD.steps)[keyof typeof APP_ARGO_PUSH_CREATE_WIZARD.steps];

// Pull model — `{consoleOrigin}/multicloud/applications/create/argopullmodel`, `#create-argo-pull-model`
export const APP_ARGO_PULL_CREATE_WIZARD = {
  ...APP_ARGO_CREATE_WIZARD_SHARED,
  routePath: '/multicloud/applications/create/argopullmodel',
  pageTitle: /^Create application set - Pull model$/i,
  yamlPatterns: {
    ...APP_ARGO_PLACEMENT_TOLERATIONS_YAML_PATTERNS,
    /** Hub may emit `key: local-cluster` instead of testcase `key: name` / local-cluster value. */
    placementPredicate:
      /kind:\s*Placement[\s\S]*predicates:[\s\S]*(?:key:\s*name[\s\S]*local-cluster|key:\s*local-cluster[\s\S]*NotIn)/,
  },
} as const;

export type AppArgoPullCreateWizardStepId =
  (typeof APP_ARGO_PULL_CREATE_WIZARD.steps)[keyof typeof APP_ARGO_PULL_CREATE_WIZARD.steps];

// =============================================================================
// Subscription application create wizard (Create application → Subscription)
// =============================================================================
//
// Full URL: `{consoleOrigin}/multicloud/applications/create/subscription`
// Entry from list: `#application-create` → menu → `#create-subscription` (see APP_CREATE_MENU).
// **Locators:** use **`testIds`** plus {@link subscriptionRepositoryDataTestId} /
// {@link subscriptionWizardGitTestId} (and Helm / Object / placement variants) — not raw input `#id` maps.
// **Hub check (`qe6-vmware-ibm`):** with **YAML off**, after Git + **Repository types** + **Select clusters…**
// accordions are expanded, mapped `data-testid`s and `#id`s below match the DOM (including `grp1` with two blocks).
// **Placement rule deprecation** alert lives under cluster placement (see `clusterDeployment.placementRuleDeprecation`).
// =============================================================================

export const APP_SUBSCRIPTION_CREATE_WIZARD = {
  /** Path after console origin (no trailing slash). */
  routePath: '/multicloud/applications/create/subscription',
  /** PF page / section title (class may be pf-v5-c-title or co-m-*). */
  title: {
    /** Prefer role heading level 1 when available */
    roleLevel: 1 as const,
  },
  /**
   * Multiple repositories / subscription templates. Each block is wrapped in
   * **`.creation-view-group-container`**; use `.nth(0)`, `.nth(1)`, …
   */
  multiChannel: {
    addChannelsButtonId: 'add-channels',
    /** DOM wrapper for each repository section. */
    repositoryBlockContainerSelector: '.creation-view-group-container',
    /**
     * Remove an **extra** subscription / repository block.
     * Use `.nth(blockIndex)` — same order as {@link APP_SUBSCRIPTION_CREATE_WIZARD.multiChannel.repositoryBlockContainerSelector}.
     */
    deleteRepositoryBlockButtonSelector: '.creation-view-controls-delete-button',
  },
  /**
   * Cluster placement (first subscription block; additional blocks use `grp{index}` on related controls).
   *
   * **Cluster sets / label rows:** PatternFly controls may use **dynamic** ids (`pf-select-toggle-id-*`).
   * Prefer **role + accessible name** via {@link SubscriptionApplicationCreateWizardPage} (`getClusterSetsCombobox`,
   * `getClusterPlacementLabelNameComboboxForRow`, …) and **`data-testid`** for placement checkboxes
   * ({@link subscriptionWizardPlacementTestId}).
   *
   * **Multiple label rows:** **Add another label** — same accessible names per row; use `*ForRow(rowIndex)`.
   *
   * **Placement rule deprecation:** an inline info **Alert** appears above existing placement rule / cluster
   * selector controls — see {@link clusterDeployment.placementRuleDeprecation}.
   */
  clusterDeployment: {
    /**
     * Copy from the console **Placement rule deprecation** alert (English default locale).
     * Use with {@link APP_DOCS_ACM_DEPRECATIONS_RELEASE_NOTES_HREF_RE} for the documentation link.
     */
    placementRuleDeprecation: {
      alertTitle: 'Placement rule deprecation',
      /** Primary body line (substring match is enough for i18n drift). */
      resourceDeprecatedSnippet: 'PlacementRule resource is deprecated',
      bestPracticeSnippet: 'Best practice',
    },
    /**
     * Expand **Select clusters for application deployment** (first subscription only).
     * Additional subscriptions: {@link subscriptionWizardClusterDeploymentSectionToggleId}.
     */
    sectionExpandId: 'clustersection-select-clusters-for-application-deployment',
    /**
     * **Deploy using cluster label selector** checkbox (first subscription).
     * Additional subscriptions: {@link subscriptionWizardClusterSelectorCheckboxId}.
     */
    clusterSelectorCheckboxId: 'clusterSelector-checkbox-clusterSelector',
    /** PF **Cluster sets** Select input (`#cluster-sets`) — prefer over label wrapper for menu open. */
    clusterSetsInputId: 'cluster-sets',
    /**
     * Accessible names for PF comboboxes in the cluster / label placement area — use when `#…` ids are
     * unstable between builds.
     */
    placementAccessibleNames: {
      clusterSets: 'Cluster sets',
      labelName: 'Label',
      labelOperator: 'Operator',
      labelValue: 'Value',
      addAnotherLabel: 'Add another label',
      /** PF radio — replaces legacy **existing placement rule** checkbox on current hubs. */
      existingPlacementConfiguration: 'Select an existing placement configuration',
    },
  },
  /**
   * Time window scheduling. Additional subscription blocks use **`grp${blockIndex}`** on element ids
   * (see {@link subscriptionTimeWindowModeRadioIds}).
   */
  timeWindow: {
    /** No scheduling restriction — deploy anytime; hides timezone / weekdays / ranges. */
    defaultModeId: 'default-mode-timeWindow',
    activeModeId: 'active-mode-timeWindow',
    blockedModeId: 'blocked-mode-timeWindow',
    /** Weekday checkbox id pattern: `{Weekday}-timeWindow` (e.g. `Monday-timeWindow`). */
    weekdayCheckboxIdSuffix: '-timeWindow',
    /** Weekday names in id order. */
    weekdays: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ] as const,
    /** Timezone picker lives under this section. */
    timezoneSectionSelector: '.config-timezone-section',
    /**
     * PF typeahead for IANA zone (`AcmSelectBase`: `aria-label` **Select timezone**, placeholder **Choose a location**).
     */
    timezoneComboboxNameRe: /select timezone|choose a location/i,
    /** Adds another start/end interval row (`start-time-n-timeWindow…`). */
    addAnotherTimeRangeButtonAccessibleName: 'Add another time range',
  },
  /**
   * **Settings: Specify application behavior** — time window / scheduling lives in this TemplateEditor section.
   * Section title is translated; {@link settings.sectionTitlePattern} matches the English console.
   */
  settings: {
    /** Accordion title match (case-insensitive substring) inside each repository block container. */
    sectionTitlePattern: /specify application behavior/i,
  },
  /**
   * Pre / post deployment automation (Ansible hooks, credential selection, etc.).
   *
   * **Prerequisite:** choose a **repository type** (Git / Helm / Object storage card) first. Until then, the
   * automation block may not appear in the form (only the shell / YAML region may be present).
   *
   * In the expanded **Configure automation for prehook and posthook** section, the Ansible row uses a PF
   * **Select** whose outer toggle keeps **dynamic ids** (`pf-select-toggle-id-*`); prefer **accessible names**
   * in {@link SubscriptionApplicationCreateWizardPage} helpers. **`Add credential`** may not be in the DOM
   * until a credential type is chosen in **Type to filter** — do not assume it is always visible.
   */
  automation: {
    configurePrePostSectionId: 'perpostsection-configure-automation-for-prehook-and-posthook',
    /**
     * Section title / accordion label. On some hubs **`getByRole('button', { name })`** does not match the
     * control — use exact **text**, **`#perpostsection-…`** ({@link subscriptionAutomationPrePostSectionToggleId}), or
     * {@link SubscriptionApplicationCreateWizardPage.getConfigurePrePostAutomationSectionTitle} (subscription create wizard).
     */
    configurePrePostToggleAccessibleText: 'Configure automation for prehook and posthook',
    /** Visible label before the Ansible / Tower control cluster. */
    ansibleCredentialLabelText: 'Ansible Automation Platform credential',
    /** Help popover beside the Ansible credential label (stable id in current console). */
    connectionLabelHelpButtonId: 'connection-label-help-button',
    /**
     * Inner PF typeahead on the Ansible credential **Select** (`aria-label`). **Not unique** inside a repository
     * block — chain from the outer Ansible credential combobox via
     * {@link SubscriptionApplicationCreateWizardPage.getAnsibleCredentialTypeFilterComboboxInRepositoryBlock}.
     */
    credentialTypeFilterComboboxAccessibleName: 'Type to filter',
    /** `Menu toggle` on the same PF Select (opens the credential type menu). */
    credentialTypeMenuToggleAccessibleName: 'Menu toggle',
    /** Text field / listbox for picking an **existing** secret (placeholder text). */
    existingSecretPlaceholder: 'Select an existing secret from the list.',
    /** Opens the Add credential wizard (may appear only after selecting a template from the filter). */
    addCredentialButtonAccessibleName: 'Add credential',
  },
  /**
   * **Add credential** modal (Ansible / Tower) opened from {@link APP_SUBSCRIPTION_CREATE_WIZARD.automation}
   * (separate from the main form DOM). **Multi-step:** **Basic information** (`credentialsName` + namespace)
   * then **Next** → **Ansible Automation Platform** (`ansibleHost`, `ansibleToken`) on current console.
   */
  addCredentialModal: {
    /** Narrow to the wizard dialog (OUIA modal). */
    dialogSelector: '[role="dialog"][data-ouia-component-type*="ModalContent"]',
    credentialsNameInputId: 'credentialsName',
    ansibleHostInputId: 'ansibleHost',
    ansibleTokenInputId: 'ansibleToken',
    /** Namespace combobox on the first step (before **Next** reveals host/token fields). */
    namespacePlaceholder: 'Select a namespace for the credential',
    nextButtonAccessibleName: 'Next',
    addButtonAccessibleName: 'Add',
  },
  /** YAML editor toggle on the create / edit form (`input#edit-yaml` checkbox in current console). */
  yamlToggleId: 'edit-yaml',
  /**
   * Label for {@link yamlToggleId} (PatternFly switch). Prefer UI clicks on this id — the hidden
   * checkbox can be covered by `.pf-v6-c-switch__toggle` (pointer events intercepted).
   */
  yamlToggleLabelId: 'edit-yaml-label',
  /**
   * YAML side panel (form vs YAML). Shown when **`yamlToggleId`** is on (checkbox checked).
   * Aligns with OpenShift console creation view + Monaco (`.creation-view-yaml` / `.yamlEditorContainer`).
   */
  yamlEditor: {
    creationViewSelector: '.creation-view-yaml',
    editorContainerSelector: '.yamlEditorContainer',
    /** Monaco keyboard sink — use for fill / inputValue. */
    monacoTextareaSelector: '.monaco-editor textarea.inputarea',
  },
  /** Hub notification drawer / region */
  notificationsRegionId: 'notifications',
  submit: {
    /** Same id as {@link APP_SUBSCRIPTION_CREATE_WIZARD.testIds.actions.create} on current console. */
    createButtonPortalVisibleId: 'create-button-portal-id',
    /**
     * Primary **Create** / **Update** `<Button>` id in the portal (`${createButtonPortalVisibleId}-btn`).
     * {@link APP_SUBSCRIPTION_CREATE_WIZARD.testIds.actions.create} remains the `data-testid` on that button.
     */
    createButtonElementId: 'create-button-portal-id-btn',
  },
  /** Toolbar portals (TemplateEditor); create vs edit flows. */
  shell: {
    cancelButtonId: 'cancel-button-portal-id',
    /** Portal mount for **Update** when editing an existing subscription app (create flow may leave empty). */
    editButtonPortalId: 'edit-button-portal-id',
  },
  /**
   * Expand/collapse accordion sections around repository configuration.
   * **Repository location** stays a single section id; **repository types** uses `channelgrp{N}-repository-types`
   * for additional subscriptions (see {@link subscriptionWizardChannelRepositoryTypesSectionToggleId}).
   */
  sectionToggles: {
    repositoryLocation: 'channelsection-repository-location-for-resources',
    /** First subscription only — additional blocks use `channelgrp${index}-repository-types`. */
    repositoryTypes: 'channel-repository-types',
  },
  /**
   * Console `data-testid` hooks on the subscription create wizard.
   * Some builds may add more; cluster/time-window controls may still be id-only.
   */
  testIds: {
    general: {
      applicationNameText: 'text-eman',
      /**
       * Namespace combobox filter input (`role="combobox"`). Matches control id **`emanspace`** after TemplateEditor’s
       * `name`→`eman` substitution inside **`namespace`** (same as DOM **`id`** on current console builds).
       */
      namespaceCombo: 'emanspace',
    },
    /** Repository type tiles (select Git vs Helm vs Object storage) */
    repositoryCard: {
      git: 'card-github',
      helm: 'card-helmrepo',
      objectStorage: 'card-objectstore',
    },
    git: {
      urlCombo: 'githubURL',
      usernameText: 'text-githubUser',
      tokenText: 'text-githubAccessId',
      branchCombo: 'githubBranch',
      pathCombo: 'githubPath',
      commitText: 'text-gitDesiredCommit',
      tagText: 'text-gitTag',
      reconcileOptionCombo: 'gitReconcileOption',
      reconcileRateCombo: 'gitReconcileRate',
      disableAutoReconcileCheckbox: 'checkbox-gitSubReconcileRate',
      insecureSkipVerifyCheckbox: 'checkbox-gitInsecureSkipVerify',
    },
    /** Helm channel */
    helm: {
      urlCombo: 'helmURL',
      usernameText: 'text-helmUser',
      passwordText: 'text-helmPassword',
      chartNameText: 'text-helmChartName',
      packageAliasText: 'text-helmPackageAlias',
      packageVersionText: 'text-helmPackageVersion',
      insecureSkipVerifyCheckbox: 'checkbox-helmInsecureSkipVerify',
      reconcileRateCombo: 'helmReconcileRate',
      disableAutoReconcileCheckbox: 'checkbox-helmSubReconcileRate',
    },
    /** Object storage channel */
    objectStorage: {
      urlCombo: 'objectstoreURL',
      accessKeyText: 'text-accessKey',
      secretKeyText: 'text-secretKey',
      regionText: 'text-region',
      subfolderText: 'text-subfolder',
    },
    /** Placement (partial; dynamic PF select toggles also appear without data-testid) */
    placement: {
      /** Legacy — checkbox on older hubs. */
      existingRuleCheckbox: 'checkbox-existingrule-checkbox',
      /** Current hub — PF radio (`input[type=radio]`) despite `checkbox-*` test id prefix. */
      existingPlacementRadio: 'checkbox-existing-placement-checkbox',
      /** Legacy placement rule typeahead. */
      placementRuleCombo: 'combo-placementrulecombo',
      /** Current hub — existing **Placement** resource dropdown. */
      placementCombo: 'placementcombo',
    },
    actions: {
      create: 'create-button-portal-id',
    },
  },
} as const;

/**
 * **More info** popover body copy for subscription create (wizard), keyed by **`[id$="-label-help-button"]`**.
 *
 * Captured from a live English hub (Git / Helm / Object card flows). **`undefined-label-help-button`**
 * is shared across repo types with **different** bodies — use {@link getSubscriptionWizardHelpPopoverText} with
 * `repositoryCard` or {@link APP_SUBSCRIPTION_WIZARD_UNDEFINED_LABEL_HELP_TEXT}.
 */
export const APP_SUBSCRIPTION_CREATE_WIZARD_HELP_POPOVER_TEXT = {
  'eman-label-help-button': 'Application name',
  'emanspace-label-help-button':
    'Set the application namespace from the list of accessible namespaces, or enter a name to create a namespace. You need authority to create namespace resources.',
  'githubURL-label-help-button': 'The URL path for the Git repository.',
  'githubUser-label-help-button':
    'The username if this is a private Git repository and requires connection.',
  'githubAccessId-label-help-button':
    'The access token if this is a private Git repository and requires connection.',
  'githubBranch-label-help-button': 'The branch of the Git repository.',
  'githubPath-label-help-button': 'The location of the resources on the Git repository.',
  'gitDesiredCommit-label-help-button':
    'If you want to subscribe to a specific commit, you need to specify the desired commit hash. You might need to specify git-clone-depth annotation if your desired commit is older than the last 20 commits.',
  'gitTag-label-help-button':
    'If you want to subscribe to a specific tag, you need to specify the tag. If both Git desired commit and tag annotations are specified, the tag is ignored. You might need to specify git-clone-depth annotation if your desired commit of the tag is older than the last 20 commits.',
  'gitReconcileOption-label-help-button':
    'With the Merge option, new fields are added and existing fields are updated in the resource. Choose to merge if resources are updated after the initial deployment. If you choose to replace, the existing resource is replaced with the Git source.',
  'gitReconcileRate-label-help-button':
    'The frequency of resource reconciliation that is used as a global repository setting. The medium default setting checks for changes to apply every three minutes and re-applies all resources every 15 minutes, even without a change. Select low to reconcile every hour. Select high to reconcile every two minutes. If you select off, the deployed resources are not automatically reconciled.',
  'gitSubReconcileRate-label-help-button':
    'Turn the auto-reconciliation off for this specific application regardless of the reconcile rate setting in the repository.',
  'gitInsecureSkipVerify-label-help-button':
    'Disable server TLS certificate verification for Git server connection.',
  'helmURL-label-help-button': 'The URL path for the Helm repository.',
  'helmUser-label-help-button':
    'The username if this is a private Helm repository and requires connection.',
  'helmPassword-label-help-button':
    'The password if this is a private Helm repository and requires connection.',
  'helmChartName-label-help-button': 'The specific name for the target Helm chart.',
  'helmPackageAlias-label-help-button': 'The alias name for the target Helm chart.',
  'helmPackageVersion-label-help-button':
    'The version or versions for the deployable. You can use a range of versions in the form >1.0, or <3.0.',
  'helmInsecureSkipVerify-label-help-button':
    'Disable server TLS certificate verification for Helm server connection.',
  'helmReconcileRate-label-help-button':
    'The frequency of resource reconciliation that is used as a global repository setting. The medium default setting checks for changes to apply every three minutes and re-applies all resources every 15 minutes, even without a change. Select low to reconcile every hour. Select high to reconcile every two minutes. If you select off, the deployed resources are not automatically reconciled.',
  'helmSubReconcileRate-label-help-button':
    'Turn the auto-reconciliation off for this specific application regardless of the reconcile rate setting in the repository.',
  'objectstoreURL-label-help-button': 'The URL path for the object store.',
  'accessKey-label-help-button': 'The access key for accessing the object store.',
  'secretKey-label-help-button': 'The secret key for accessing the object store.',
  'region-label-help-button':
    'The AWS Region of the S3 bucket. This field is required for Amazon S3 buckets only.',
  'subfolder-label-help-button':
    'The Amazon S3 or MinIO subfolder bucket path. This field is optional for Amazon S3 and MinIO only.',
  'connection-label-help-button':
    'If using Configure automation for prehook and posthook tasks, select the Ansible Automation Platform credential. Click the Add credentials tab to create a new secret.',
  'existingrule-checkbox-label-help-button':
    'If available in the application namespace, you can select a predefined placement configuration',
  'clusterSelector-label-help-button':
    'Enter one or more matching labels to select the clusters to deploy to',
} as const;

/**
 * `#undefined-label-help-button` — same element id for **Git / Helm / Object** cards; popover **body** depends on selection.
 */
export const APP_SUBSCRIPTION_WIZARD_UNDEFINED_LABEL_HELP_TEXT = {
  git: 'Use a Git repository',
  helm: 'Use a Helm repository',
  objectStorage: 'Use a bucket from an object storage repository',
} as const;

export type AppSubscriptionCreateWizardHelpPopoverId =
  keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD_HELP_POPOVER_TEXT;

export type SubscriptionWizardRepositoryCardKind = keyof typeof APP_SUBSCRIPTION_WIZARD_UNDEFINED_LABEL_HELP_TEXT;

/**
 * Returns expected English popover body for a **More info** button id, or `undefined` if not recorded.
 * Pass **`repositoryCard`** when `helpButtonId === 'undefined-label-help-button'`.
 */
export function getSubscriptionWizardHelpPopoverText(
  helpButtonId: string,
  options?: { repositoryCard?: SubscriptionWizardRepositoryCardKind }
): string | undefined {
  if (helpButtonId === 'undefined-label-help-button' && options?.repositoryCard) {
    return APP_SUBSCRIPTION_WIZARD_UNDEFINED_LABEL_HELP_TEXT[options.repositoryCard];
  }
  const map = APP_SUBSCRIPTION_CREATE_WIZARD_HELP_POPOVER_TEXT;
  return helpButtonId in map
    ? map[helpButtonId as AppSubscriptionCreateWizardHelpPopoverId]
    : undefined;
}

export type AppSubscriptionTimeWindowWeekday =
  (typeof APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.weekdays)[number];

/**
 * Active / blocked mode radio **`#id`** for subscription block `blockIndex` (additional blocks: `…grpN` suffix).
 */
export function subscriptionTimeWindowModeRadioIds(blockIndex: number): {
  defaultId: string;
  activeId: string;
  blockedId: string;
} {
  if (blockIndex <= 0) {
    return {
      defaultId: APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.defaultModeId,
      activeId: APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.activeModeId,
      blockedId: APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.blockedModeId,
    };
  }
  const g = `grp${blockIndex}`;
  return {
    defaultId: `${APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.defaultModeId}${g}`,
    activeId: `${APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.activeModeId}${g}`,
    blockedId: `${APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.blockedModeId}${g}`,
  };
}

/**
 * Weekday checkbox id for **time window** day selection (`Monday-timeWindow`, …; `Monday-timeWindowgrp1`, …).
 */
export function subscriptionTimeWindowDayCheckboxId(
  weekday: AppSubscriptionTimeWindowWeekday | string,
  blockIndex: number
): string {
  const base = `${weekday}${APP_SUBSCRIPTION_CREATE_WIZARD.timeWindow.weekdayCheckboxIdSuffix}`;
  return blockIndex <= 0 ? base : `${base}grp${blockIndex}`;
}

/**
 * Start / end time inputs for interval `rangeIndex` (`0` = first row).
 */
export function subscriptionTimeWindowRangeInputIds(
  rangeIndex: number,
  blockIndex: number
): { startId: string; endId: string } {
  const group = blockIndex <= 0 ? '' : `grp${blockIndex}`;
  return {
    startId: `start-time-${rangeIndex}-timeWindow${group}-input`,
    endId: `end-time-${rangeIndex}-timeWindow${group}-input`,
  };
}

/**
 * Expand control for **Configure automation** (pre/post) for repository block `blockIndex`
 * (`blockIndex > 0`: `#perpostsectiongrp{N}-set-pre-and-post-deployment-tasks`).
 */
export function subscriptionAutomationPrePostSectionToggleId(blockIndex: number): string {
  if (blockIndex <= 0) {
    return APP_SUBSCRIPTION_CREATE_WIZARD.automation.configurePrePostSectionId;
  }
  return `perpostsectiongrp${blockIndex}-set-pre-and-post-deployment-tasks`;
}

/**
 * `data-testid` suffix for repository blocks after the first.
 * Example: 2nd block `githubURL` → `githubURLgrp1`.
 */
export function subscriptionRepositoryBlockTestIdSuffix(blockIndex: number): string {
  if (blockIndex <= 0) return '';
  return `grp${blockIndex}`;
}

/**
 * Full `data-testid` for a **base** id from {@link APP_SUBSCRIPTION_CREATE_WIZARD.testIds} (git / helm / objectStorage / placement)
 * in the given repository block (`0` = first; unsuffixed).
 */
export function subscriptionRepositoryDataTestId(
  baseTestId: string,
  blockIndex: number
): string {
  const suffix = subscriptionRepositoryBlockTestIdSuffix(blockIndex);
  return suffix ? `${baseTestId}${suffix}` : baseTestId;
}

/** Resolved **`data-testid`** for a Git channel control in repository block `blockIndex`. */
export function subscriptionWizardGitTestId(
  fieldKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.git,
  blockIndex: number
): string {
  return subscriptionRepositoryDataTestId(
    APP_SUBSCRIPTION_CREATE_WIZARD.testIds.git[fieldKey] as string,
    blockIndex
  );
}

/** Resolved **`data-testid`** for a Helm channel control in repository block `blockIndex`. */
export function subscriptionWizardHelmTestId(
  fieldKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.helm,
  blockIndex: number
): string {
  return subscriptionRepositoryDataTestId(
    APP_SUBSCRIPTION_CREATE_WIZARD.testIds.helm[fieldKey] as string,
    blockIndex
  );
}

/** Resolved **`data-testid`** for an object-storage channel control in repository block `blockIndex`. */
export function subscriptionWizardObjectStorageTestId(
  fieldKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.objectStorage,
  blockIndex: number
): string {
  return subscriptionRepositoryDataTestId(
    APP_SUBSCRIPTION_CREATE_WIZARD.testIds.objectStorage[fieldKey] as string,
    blockIndex
  );
}

/** Resolved **`data-testid`** for placement controls in repository block `blockIndex`. */
export function subscriptionWizardPlacementTestId(
  fieldKey: keyof typeof APP_SUBSCRIPTION_CREATE_WIZARD.testIds.placement,
  blockIndex: number
): string {
  return subscriptionRepositoryDataTestId(
    APP_SUBSCRIPTION_CREATE_WIZARD.testIds.placement[fieldKey] as string,
    blockIndex
  );
}

/**
 * **`#id`** for the **Select clusters for application deployment** accordion toggle.
 * Example additional block: `#clustersectiongrp1-select-clusters-for-application-deployment`.
 */
export function subscriptionWizardClusterDeploymentSectionToggleId(blockIndex: number): string {
  if (blockIndex <= 0) {
    return APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.sectionExpandId;
  }
  return `clustersectiongrp${blockIndex}-select-clusters-for-application-deployment`;
}

/**
 * **`#id`** for the **Repository types** accordion (`channel-repository-types` vs `channelgrp1-repository-types`, …).
 */
export function subscriptionWizardChannelRepositoryTypesSectionToggleId(blockIndex: number): string {
  if (blockIndex <= 0) {
    return APP_SUBSCRIPTION_CREATE_WIZARD.sectionToggles.repositoryTypes;
  }
  return `channelgrp${blockIndex}-repository-types`;
}

/**
 * **`#id`** for **Deploy using cluster label selector** (additional subscriptions append `grp{N}`).
 * Example: `#clusterSelector-checkbox-clusterSelector` and `#clusterSelector-checkbox-clusterSelectorgrp1` on a multi-block form.
 */
export function subscriptionWizardClusterSelectorCheckboxId(blockIndex: number): string {
  if (blockIndex <= 0) {
    return APP_SUBSCRIPTION_CREATE_WIZARD.clusterDeployment.clusterSelectorCheckboxId;
  }
  return `clusterSelector-checkbox-clusterSelectorgrp${blockIndex}`;
}

/**
 * Legacy **`#id`** pattern for **cluster selector** label / value controls (PF may still expose these alongside combobox roles).
 * For `subscriptionBlockIndex > 0`, ids include **`clusterSelectorgrp${subscriptionBlockIndex}`**
 * (e.g. `labelName-0-clusterSelectorgrp1-label`).
 */
export function subscriptionWizardClusterSelectorLabelDomIds(
  labelRowIndex: number,
  subscriptionBlockIndex: number
): { labelNameId: string; labelValueId: string } {
  if (subscriptionBlockIndex <= 0) {
    return {
      labelNameId: `labelName-${labelRowIndex}-clusterSelector-label`,
      labelValueId: `labelValue-${labelRowIndex}-clusterSelector-label`,
    };
  }
  return {
    labelNameId: `labelName-${labelRowIndex}-clusterSelectorgrp${subscriptionBlockIndex}-label`,
    labelValueId: `labelValue-${labelRowIndex}-clusterSelectorgrp${subscriptionBlockIndex}-label`,
  };
}

/**
 * **`#ansibleSecretName{N}-label`** focus target used in ALC flows for **additional** subscription blocks (`blockIndex >= 1`).
 * May appear only after expanding automation for that block (depends on hub / flow).
 */
export function subscriptionAutomationAnsibleSecretNameLabelId(blockIndex: number): string | undefined {
  if (blockIndex <= 0) return undefined;
  return `ansibleSecretName${blockIndex}-label`;
}

/** RHACM4K-64417 — pre-seeded push-model ApplicationSet + Placement (Helm chart generator). */
export const APP_ARGO_HELM_APPSET = {
  applicationSetName: 'test-api-argo-helm',
  placementName: 'test-api-argo-helm-placement',
  placementDecisionName: 'test-api-argo-helm-placement-decision-1',
  namespace: 'openshift-gitops',
  clusterSet: 'auto-gitops-cluster-set',
  targetCluster: 'local-cluster',
  setupYamlRelativePath: 'src/templates/app/argo-helm-appset-setup.yaml',
} as const;
