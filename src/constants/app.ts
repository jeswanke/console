/**
 * Application Lifecycle (ALC) constants.
 *
 * Routes, toolbar IDs, table column labels, and UI strings for the
 * Applications list and related pages. Sourced from the Applications
 * main page DOM (PF6, multicloud/applications).
 */

// =============================================================================
// Routes
// =============================================================================

export const APP_ROUTES = {
  list: '/multicloud/applications',
  /** Advanced configuration tab (secondary nav) */
  advanced: '/multicloud/applications/advanced',
  /** Application details: namespace, name; query params apiVersion, cluster come from UI */
  details: (namespace: string, name: string) =>
    `/multicloud/applications/details/${namespace}/${name}`,
} as const;

// =============================================================================
// Documentation URLs (View documentation links)
// =============================================================================

export const APP_DOCS = {
  /** Applications – managing applications (Type column help popover, Advanced config terminology card) */
  applicationsManaging:
    'https://docs.redhat.com/en/documentation/red_hat_advanced_cluster_management_for_kubernetes/2.16/html-single/applications/index#managing-applications',
} as const;

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
} as const;

/** Create application dropdown (PF6 Menu). Click opens a menu (role="menu", .pf-v6-c-menu). */
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
  /** Description text under each menu option (pf-v6-c-menu__item-description). */
  optionDescriptions: {
    argoPullModel:
      'Considered the better choice for security although you cannot deploy to hub cluster. Managed clusters pull application resources directly from Git repositories.',
    argoPushModel:
      'Hub cluster pushes application resources to managed clusters requiring credentials for each cluster.',
    subscription: '',
  },
  /** Label shown next to Subscription option (pf-v6-c-label). */
  subscriptionDeprecatedLabel: 'Deprecated',
} as const;

/** Compare application types popover (PF6 Popover, role="dialog"). Opened by Compare application types button. */
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
  healthStatus: 'Health Status',
  syncStatus: 'Sync Status',
  podStatus: 'Pod Status',
  created: 'Created',
} as const;

/** Row action kebab */
export const APP_TABLE_ROW_ACTIONS = {
  actionsAriaLabel: 'Actions',
} as const;

/** Overview table column help popovers (PF6 Popover; click help icon next to column header). */
export const APP_TABLE_COLUMN_HELP = {
  viewDocsLinkText: 'View documentation',
  viewDocsHref: APP_DOCS.applicationsManaging,
  closeButtonLabel: 'Close',
  /** Column data-label -> popover body description (all have View documentation link). */
  columns: {
    Type: 'Displays the type of the application.',
    Namespace:
      'Displays the namespace of the application resource, which by default is where the application deploys other resources. For Argo applications, this is the destination namespace.',
    Clusters:
      'For Subscription applications, displays the number of remote and local clusters where resources for the application are deployed. For Argo applications, this is the name of the destination cluster. For OpenShift applications, this is the cluster where the application is deployed.',
    'Health Status': 'Health status for ArgoCD applications.',
    'Sync Status': 'Sync status for ArgoCD applications.',
    'Pod Status': 'Status of pods deployed by the application.',
  },
} as const;

export type AppTableColumnHelpKey = keyof typeof APP_TABLE_COLUMN_HELP.columns;

// =============================================================================
// Filter dropdown (opened by Filter toolbar button)
// =============================================================================

/** Filter menu (PF6 Select) opened when clicking the Filter button */
export const APP_FILTER = {
  /** aria-label on the open menu container */
  menuAriaLabel: 'acm-table-filter-select-key',
  /** Section titles inside the filter menu */
  groupTitles: {
    type: 'Type',
    cluster: 'Cluster',
  },
  /** Known Type filter option labels */
  typeOptions: {
    system: 'System',
    openshift: 'OpenShift',
  },
} as const;

// =============================================================================
// Advanced Configuration tab (Subscriptions, Channels, Placements, Placement rules)
// =============================================================================
//
// Snapshot (DOM): Route /multicloud/applications/advanced. Same masthead/sidebar
// as Overview. Secondary tabs: Overview | Advanced configuration (selected).
// Content: (1) Expandable "Learn more about the terminology" card (id above),
//   sub-cards Subscriptions/Channels/Placements/Placement rules (some Deprecated);
//   "View documentation" link. (2) Toggle group: Subscriptions|Channels|Placements|
//   Placement rules (button ids subscriptions, channels, placements, placementrules).
// (3) Toolbar: search (custom-advanced-search), export (export-search-result),
//   pagination (options-menu-top-pagination). (4) Table: role=grid, aria-label
//   "Simple Table"; columns Name, Namespace, Channel, Applications, Clusters,
//   Time window, Created; rows data-ouia-component-id; Actions kebab.
//
/** Terminology card and resource-type toggle (Advanced configuration tab only). */
export const APP_ADVANCED_CONFIG = {
  /** Expandable card id and title */
  terminologyCard: {
    id: 'ApplicationDeploymentHighlightsTerminology',
    title: 'Learn more about the terminology',
    /** Sub-card titles in the expandable section */
    termTitles: {
      subscriptions: 'Subscriptions',
      channels: 'Channels',
      placements: 'Placements',
      placementRules: 'Placement rules',
    },
    /** Deprecated label shown next to some terms (pf-v6-c-label) */
    deprecatedLabel: 'Deprecated',
    viewDocsLinkText: 'View documentation',
    viewDocsHref: APP_DOCS.applicationsManaging,
  },
  /** Toggle group (PF6): resource type filter. Button ids from DOM. */
  resourceToggle: {
    ids: {
      subscriptions: 'subscriptions',
      channels: 'channels',
      placements: 'placements',
      placementRules: 'placementrules',
    },
    labels: {
      subscriptions: 'Subscriptions',
      channels: 'Channels',
      placements: 'Placements',
      placementRules: 'Placement rules',
    },
  },
  /** Same toolbar search/export/pagination ids as Overview; table uses APP_TABLE. */
  /** Empty state (when no resources). Verify title, body, and actions. */
  emptyState: {
    /** Description text in empty state body (same for all views). */
    body: 'To get started, create an application.',
    /** Primary action button/link in empty state footer. */
    createApplicationLabel: 'Create application',
    /** Title (h4) per view. Match is substring so "yet" is optional. */
    titles: {
      subscriptions: "You don't have any subscriptions",
      channels: "You don't have any channels",
      placements: "You don't have any placements",
      placementRules: "You don't have any placement rules",
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
  placements: 'placements.cluster.open-cluster-management.io',
  placementRules: 'placementrules.apps.open-cluster-management.io',
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

/** Advanced config table columns – Placements view (Name, Namespace, Clusters, Created). */
export const APP_ADVANCED_TABLE_COLUMNS_PLACEMENTS = {
  name: 'Name',
  namespace: 'Namespace',
  clusters: 'Clusters',
  created: 'Created',
} as const;

/** Advanced config table columns – Placement rules view (adds Replicas). */
export const APP_ADVANCED_TABLE_COLUMNS_PLACEMENT_RULES = {
  name: 'Name',
  namespace: 'Namespace',
  clusters: 'Clusters',
  replicas: 'Replicas',
  created: 'Created',
} as const;
