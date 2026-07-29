/**
 * Fleet Virtualization constants.
 *
 * Organized hierarchically by UI location:
 *   FLEET_VIRT_ROUTES       -- navigation paths
 *   FLEET_VIRT_PAGE         -- page-level elements (perspective switcher, heading)
 *   FLEET_VIRT_SEARCH       -- VM search bar (autocomplete dropdown)
 *   FLEET_VIRT_ADVANCED_SEARCH -- advanced search modal (cluster/project/name filters)
 *   FLEET_VIRT_SAVED_SEARCH -- save/load/remove saved searches
 *   FLEET_VIRT_VM_TABLE     -- VM list table (VirtualizedTable, NOT AcmTable)
 *   FLEET_VIRT_TREE_VIEW    -- left sidebar tree view
 *
 * Selectors verified against kubevirt-ui/kubevirt-plugin release-4.21 via acm-ui MCP.
 * Fleet Virt uses VirtualizedTable from @openshift-console/dynamic-plugin-sdk,
 * not AcmTable from stolostron/console.
 */

// =============================================================================
// Routes
// =============================================================================

export const FLEET_VIRT_ROUTES = {
  vmList: '/fleet-virtualization/kubevirt.io~v1~VirtualMachine/all-clusters/all-namespaces',
} as const;

// =============================================================================
// Page-level elements
// =============================================================================

export const FLEET_VIRT_PAGE = {
  perspectiveSwitcher: '[data-test-id="perspective-switcher-toggle"]',
  fleetManagementLabel: 'Fleet Management',
  emptyState: {
    noVMs: 'No VirtualMachines found',
  },
} as const;

// =============================================================================
// VM search bar (toolbar autocomplete)
// =============================================================================

export const FLEET_VIRT_SEARCH = {
  searchInput: '[data-test="vm-search-input"] input',
  searchResults: '[data-test="search-results"]',
  resetButton: 'button[aria-label="Reset"]',
} as const;

// =============================================================================
// Advanced search modal
//
// Source: kubevirt-plugin AdvancedSearchModal + formFields (ClusterField, ProjectField, NameField)
// Uses MultiSelectTypeahead for cluster/project (PF6 typeahead with menu).
// =============================================================================

export const FLEET_VIRT_ADVANCED_SEARCH = {
  openButton: '[data-test="vm-advanced-search-button"]',
  detailsContainer: '[data-test="adv-search-details"]',
  nameInput: '[data-test="adv-search-vm-name"]',
  cluster: {
    dataTest: 'adv-search-vm-cluster',
    wrapper: '[data-test="adv-search-vm-cluster"]',
    placeholder: 'All clusters',
    selectPlaceholder: 'Select cluster',
    toggleClose: 'button[aria-label="Multi select Typeahead menu toggle"]',
  },
  project: {
    dataTest: 'adv-search-vm-project',
    wrapper: '[data-test="adv-search-vm-project"]',
    placeholder: 'All projects',
    selectPlaceholder: 'Select project',
    toggleClose: 'button[aria-label="Multi select Typeahead menu toggle"]',
  },
  menuContent: '.pf-v6-c-menu__content',
  footer: {
    searchButton: 'Search',
    clearAllButton: 'Clear all',
  },
} as const;

// =============================================================================
// Saved searches
//
// Source: kubevirt-plugin SaveSearchModal + SavedSearchesDropdown
// =============================================================================

export const FLEET_VIRT_SAVED_SEARCH = {
  saveButton: 'Save search',
  modal: {
    nameInput: '[data-test-id="save-search-name"]',
    descriptionInput: '[data-test-id="save-search-description"]',
    submitButton: '[data-test="save-button"]',
    cancelButton: '[data-test="cancel-button"]',
  },
  dropdown: {
    toggle: 'Saved searches',
    list: '[data-test="saved-searches"]',
    item: (name: string) => `[data-test="saved-search-item-${name}"]`,
    deleteItem: (name: string) => `[data-test="delete-search-item-${name}"]`,
    deleteAriaLabel: 'Delete saved search',
  },
} as const;

// =============================================================================
// Tree view sidebar
// =============================================================================

export const FLEET_VIRT_TREE_VIEW = {
  clusterPrefix: 'clusterSelector',
  projectPrefix: 'projectSelector',
  nodeToggle: 'button.pf-v6-c-tree-view__node-toggle',
  nodeText: 'button.pf-v6-c-tree-view__node-text',
} as const;

// =============================================================================
// VM action buttons (details page icon bar)
// =============================================================================

export const FLEET_VIRT_VM_ACTIONS = {
  dropdown: '[data-test="actions-dropdown"]',
  startButton: '[data-test-id="vm-action-start-button"]',
  stopButton: '[data-test-id="vm-action-stop-button"]',
  pauseButton: '[data-test-id="vm-action-pause-button"]',
  restartButton: '[data-test-id="vm-action-restart-button"]',
  statusLabel: '[data-test-id="virtual-machine-overview-details-status"]',
  confirmAction: '[data-test="confirm-action"]',
} as const;

// =============================================================================
// Test defaults
// =============================================================================

export const FLEET_VIRT_DEFAULTS = {
  vmNamespace: 'default',
  spokeCluster: process.env.VIRT_SPOKE_CLUSTER?.split(',')[0] || 'local-cluster',
} as const;
