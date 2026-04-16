/**
 * Centralized CSS selectors.
 *
 * Structure:
 * - PF_* : PatternFly component selectors (global)
 * - SELECTORS.domain.* : Domain-specific selectors (namespaced)
 *
 * When to split into separate files:
 * - This file exceeds ~150 lines
 * - A domain has 20+ unique selectors
 * - Split by TYPE first (selectors.ts, routes.ts, labels.ts), not by domain
 */

const PF = 'pf-v6-c'; // Single version per ACM release

// =============================================================================
// PatternFly Components (used across all domains)
// =============================================================================
export const PF_MASTHEAD = `.${PF}-masthead, .co-masthead`;
export const PF_SPINNER = `.${PF}-spinner`;
export const PF_SKELETON = `.${PF}-skeleton`;
export const PF_MODAL = `.${PF}-modal-box`;
export const PF_ALERT = `.${PF}-alert`;
export const PF_SELECT = `.${PF}-select`;
export const PF_DROPDOWN = `.${PF}-dropdown`;
export const PF_TABLE = `.${PF}-table`;

// =============================================================================
// Domain-Specific Selectors
// =============================================================================
export const SELECTORS = {
  /** Common selectors used across multiple domains */
  common: {
    /** Prefer `acmToolbarSearchLocator(page)` — PF/AcmSearchInput markup can vary by release. */
    searchInput: '[aria-label="Search input"]',
    /** Masthead user menu (toggle); live console uses `user-dropdown-toggle` */
    userDropdown: '[data-test="user-dropdown-toggle"], [data-test="user-dropdown"]',
    tableRow: (ouiaId: string) => `tr[data-ouia-component-id="${ouiaId}"]`,
  },

  /** Cluster lifecycle domain */
  cluster: {
    /** Live console uses button ids; keep data-test for older builds */
    createButton: '#createCluster, [data-test="create-cluster"]',
    importButton: '#importCluster, [data-test="import-cluster"]',
    row: (name: string) => `tr[data-ouia-component-id="${name}"]`,
  },

  /** Application Lifecycle domain (Applications list, details, Advanced configuration tab) */
  application: {
    createButton: '#application-create',
    table: '[aria-label="Simple Table"]',
    rowByOuiaId: (ouiaId: string) => `tr[data-ouia-component-id="${ouiaId}"]`,
    exportButton: '#export-search-result',
    filterButton: '#acm-table-filter-select-undefined',
    /** Advanced configuration tab: terminology card and resource-type toggle buttons */
    terminologyCard: '#ApplicationDeploymentHighlightsTerminology',
    resourceToggle: {
      subscriptions: '#subscriptions',
      channels: '#channels',
      placements: '#placements',
      placementRules: '#placementrules',
    },
  },

  /** Governance/Policy domain */
  policy: {
    // Add as needed
  },

  /** Search domain */
  search: {
    // Add as needed
  },
} as const;
