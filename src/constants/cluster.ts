/**
 * Cluster Lifecycle constants.
 *
 * Routes, table column labels, tooltip text, and column management strings
 * for the Managed Clusters list page.
 */

// =============================================================================
// Routes
// =============================================================================

export const CLUSTER_ROUTES = {
  managed: '/multicloud/infrastructure/clusters/managed',
  sets: '/multicloud/infrastructure/clusters/sets',
  overview: '/multicloud/home/overview',
  details: (namespace: string, name: string) =>
    `/multicloud/infrastructure/clusters/details/${namespace}/${name}`,
  detailOverview: (namespace: string, name: string) =>
    `/multicloud/infrastructure/clusters/details/${namespace}/${name}/overview`,
  // Note: ACM console doesn't deep-link to detail tabs — /addons redirects to overview.
  // Navigate to details() and click the tab via page.getByRole('tab', { name: 'Add-ons' }).
  nodes: (namespace: string, name: string) =>
    `/multicloud/infrastructure/clusters/details/${namespace}/${name}/nodes`,
} as const;

// =============================================================================
// Selectors
// =============================================================================

export const CLUSTER_SELECTORS = {
  popoverBody: '.pf-v6-c-popover__body',
} as const;

// =============================================================================
// Table columns
// =============================================================================

export const CLUSTER_TABLE_COLUMNS = {
  gpuCount: 'GPU count',
} as const;

// =============================================================================
// GPU count column
// =============================================================================

export const GPU_COLUMN = {
  id: 'gpu-count',
  header: CLUSTER_TABLE_COLUMNS.gpuCount,
  clusterTooltipText:
    'The count of GPUs on the managed cluster is gathered from the "node_accelerator_card_info" metric, which is present only when Red Hat Advanced Cluster Management Observability is installed.',
  nodeTooltipText:
    'The count of GPUs on a Node is gathered from the "node_accelerator_card_info" metric, which is present only when Red Hat Advanced Cluster Management Observability is installed.',
  observabilityMetricsLink: 'Observability metrics',
} as const;

// =============================================================================
// Column management
// =============================================================================

export const CLUSTER_MANAGE_COLUMNS = {
  buttonAriaLabel: 'columns-management',
  modalTitle: 'Manage columns',
  saveButton: 'Save',
  cancelButton: 'Cancel',
  restoreDefaults: 'Restore defaults',
  checkboxId: (columnId: string) => `checkbox-${columnId}`,
} as const;
