/**
 * Centralized CSS selectors.
 *
 * Structure:
 * - PF_* : PatternFly component selectors (global, used across all domains)
 * - SELECTORS.domain.* : Domain-specific selectors for areas without their own constants file
 *
 * Areas with 20+ selectors have their own constants files (fg-rbac.ts, fleet-virt.ts, app.ts).
 * Those files are the authoritative source for domain selectors.
 * This file owns PatternFly globals and small cross-domain selectors only.
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
// Domain-Specific Selectors (small domains without their own constants file)
// For FG-RBAC selectors: see constants/fg-rbac.ts
// For Fleet Virt selectors: see constants/fleet-virt.ts
// For ALC selectors: see constants/app.ts
// =============================================================================
export const SELECTORS = {
  /** Common selectors used across multiple domains */
  common: {
    /** Prefer {@link acmToolbarSearchLocator} from `@components/patternfly/AcmSearchInput`. */
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
    terminologyCard: '#ApplicationDeploymentHighlightsTerminology',
    resourceToggle: {
      subscriptions: '#subscriptions',
      channels: '#channels',
    },
    /** Application details → Topology tab toolbar (zoom / pan); ids from ACM console topology view */
    topologyToolbar: {
      zoomIn: '#zoom-in',
      zoomOut: '#zoom-out',
      fitToScreen: '#fit-to-screen',
      resetView: '#reset-view',
    },
    /** Topology graph: example channel node `id` when console emits it (see `APP_APPLICATION_TOPOLOGY.graphElementIds`). */
    topologyGraph: {
      channelCombo: '#comboChannel',
    },
  },

  /** Governance/Policy domain */
  governance: {
    // Add as needed
  },

  /** Search domain */
  search: {
    // Add as needed
  },
} as const;
