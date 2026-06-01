/**
 * Governance domain constants.
 *
 * Routes, tab labels, detail field labels, and UI strings for the
 * Governance pages (Policies, Policy sets, Placements).
 */

// =============================================================================
// Routes
// =============================================================================

export const GOV_ROUTES = {
  governance: '/multicloud/governance',
  policyDetails: (namespace: string, name: string) =>
    `/multicloud/governance/policies/details/${namespace}/${name}`,
} as const;

export const GOV_PLACEMENT_ROUTES = {
  details: (namespace: string, name: string) =>
    `/multicloud/infrastructure/clusters/placements/details/${namespace}/${name}`,
} as const;

// =============================================================================
// Page structure
// =============================================================================

export const GOV_PAGE = {
  title: 'Governance',
  tabs: {
    overview: 'Overview',
    policySets: 'Policy sets',
    policies: 'Policies',
    discoveredPolicies: 'Discovered policies',
  },
} as const;

// =============================================================================
// Policy details page
// =============================================================================

export const GOV_POLICY_DETAILS = {
  tabs: {
    details: 'Details',
    results: 'Results',
  },
  fields: {
    name: 'Name',
    description: 'Description',
    namespace: 'Namespace',
    status: 'Status',
    remediation: 'Remediation',
    cluster: 'Cluster',
    categories: 'Categories',
    controls: 'Controls',
    standards: 'Standards',
    created: 'Created',
    automation: 'Automation',
    placement: 'Placement',
  },
} as const;

// =============================================================================
// Placement details page
// =============================================================================

export const GOV_PLACEMENT_DETAILS = {
  tabs: {
    overview: 'Overview',
  },
  sections: {
    details: 'Details',
    usedIn: 'Used in',
  },
  governance: {
    heading: 'Governance',
    columns: {
      name: 'Name',
      type: 'Type',
      namespace: 'Namespace',
    },
    types: {
      policy: 'Policy',
      policySet: 'PolicySet',
    },
  },
} as const;

// =============================================================================
// Test resource names (used in placement-references tests)
// =============================================================================

export const GOV_TEST_RESOURCES = {
  namespace: 'open-cluster-management-global-set',
  placement: 'e2e-lifecycle-placement',
  policy: 'e2e-test-policy',
  policySet: 'e2e-test-policyset',
} as const;
