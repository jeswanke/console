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
  discoveredPolicyDetails: (clusterName: string, policyName: string) =>
    `/multicloud/governance/discovered-policies/details/local-cluster/${clusterName}.${policyName}`,
  policyTemplateDetails: (namespace: string, policyName: string, templateName: string) =>
    `/multicloud/governance/policies/details/${namespace}/${policyName}/template/${templateName}`,
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
// Discovered policy details page
// =============================================================================

export const GOV_DISCOVERED_POLICY_DETAILS = {
  tabs: {
    relatedResources: 'Related resources',
    clusters: 'Clusters',
  },
  labelFilterText: 'Label',
  noLabelsIndicator: '-',
} as const;

// =============================================================================
// Test resource names (used in discovered-policy-labels tests)
// =============================================================================

export const GOV_DISCOVERED_TEST_RESOURCES = {
  namespace: 'compliance-test-ns',
  parentPolicy: 'compliance-check-policy',
  labeledPolicy: 'compliance-e8-scan',
  unlabeledPolicy: 'compliance-suite-e8',
  placement: 'compliance-check-placement',
  label: {
    key: 'custom-classification',
    value: 'compliance-scan',
    formatted: 'custom-classification=compliance-scan',
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

// =============================================================================
// Policy Template Details page (Labels test -- RHACM4K-63381)
// =============================================================================

export const GOV_TEMPLATE_DETAILS = {
  sectionId: 'TextDetail',
  fields: {
    labels: 'Labels',
  },
} as const;

export const GOV_LABELS = {
  noLabels: 'No labels',
} as const;

export const GOV_CLUSTER_BACKUP = {
  discoveredPolicy: 'acm-backup-phase-validation',
  managedPolicyNs: 'open-cluster-management-backup',
  managedPolicyName: 'backup-restore-enabled',
  managedTemplateName: 'backup-restore-enabled',
  clusterName: 'local-cluster',
} as const;

export const GOV_POLICY_API = {
  resource: 'configurationpolicy',
  group: 'policy.open-cluster-management.io',
  version: 'v1',
  kind: 'ConfigurationPolicy',
} as const;
