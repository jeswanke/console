/** ACM Search routes and UI strings (stolostron/console `NavigationPath.search`). */

export const SEARCH_ROUTES = {
  page: '/multicloud/search',
  resourceDetails: '/multicloud/search/resources',
} as const;

export const SEARCH_PAGE = {
  // Common
  title: 'Search',
  searchInputAriaLabel: 'Search input',
  searchPlaceholder:
    'Search by keywords or filters, for example "label:environment=production my-cluster"',
  runSearchButtonId: 'run-search-button',
  savedSearchesDropdown: 'Saved searches',
  openNewSearchTab: 'Open new search tab',
  suggestedCardSectionHeader: 'Suggested search templates',
  workloadSuggestedCardHeader: 'Workloads',

  //filters
  deploymentSearchQuery: 'kind:Deployment',

  // results
  desiredColumn: 'Desired',
  searchApiDeploymentName: 'search-api',
  clusterRelatedResourceLabel: 'Cluster',
} as const;

export const SAVED_SEARCH = {
  saveSearchButton: 'Save search',
  modal: {
    nameInputPlaceholder: 'Enter a name for this search query',
    saveButton: 'Save',
    cancelButton: 'Cancel',
  },
  card: {
    /** CSS class on the PatternFly 6 plain MenuToggle that opens card actions */
    kebabToggleSelector: 'button.pf-v6-c-menu-toggle',
    editAction: 'Edit',
    shareAction: 'Share',
    deleteAction: 'Delete',
  },
  deleteModal: {
    confirmButton: 'Delete',
  },
} as const;

export const SEARCH_DETAILS_PAGE = {
  tabs: {
    details: 'Details',
    yaml: 'YAML',
    relatedResources: 'Related resources',
    logs: 'Logs',
  },
  podDetailsSection: 'Pod details',
  conditionsSection: 'Conditions',
  podNameFilter: 'search-api-*',
  clusterAccordionLabel: 'Cluster',
  yamlPodKindLine: 'kind: Pod',
} as const;
