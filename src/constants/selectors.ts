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
    searchInput: '[aria-label="Search input"]',
    userDropdown: '[data-test="user-dropdown"]',
    tableRow: (ouiaId: string) => `tr[data-ouia-component-id="${ouiaId}"]`,
  },

  /** Cluster lifecycle domain */
  cluster: {
    createButton: '[data-test="create-cluster"]',
    importButton: '[data-test="import-cluster"]',
    row: (name: string) => `tr[data-ouia-component-id="${name}"]`,
  },

  /** Application domain */
  application: {
    // Add as needed
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
