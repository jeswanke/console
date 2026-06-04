/**
 * Governance — create wizards (RHACM4K-64217/64218/64221/64222) and detail-page constants (main).
 */
import { PLACEMENT_CLUSTER_PREVIEW } from '@constants/placement-preview';
import { PLACEMENT_TOLERATIONS_YAML_PATTERNS } from '@constants/placement-tolerations';

export const GOV_ROUTES = {
  governance: '/multicloud/governance',
  policyDetails: (namespace: string, name: string) =>
    `/multicloud/governance/policies/details/${namespace}/${name}`,
} as const;

export const GOVERNANCE_ROUTES = {
  governanceOverview: GOV_ROUTES.governance,
  policiesList: '/multicloud/governance/policies',
  createPolicy: '/multicloud/governance/policies/create',
  policySetsList: '/multicloud/governance/policy-sets',
  createPolicySet: '/multicloud/governance/policy-sets/create',
} as const;

export const POLICY_LIST = {
  policiesTabLabel: /^Policies$/i,
  createPolicyButtonLabel: /^Create policy$/i,
} as const;

export const POLICY_CREATE_WIZARD = {
  pageTitle: /^Create policy$/i,
  contentAriaLabel: 'Policy content',
  stepsNavAriaLabel: 'Policy steps',
  details: {
    nameTextboxLabel: /^Name$/i,
    namespaceComboboxLabel: /Select namespace/i,
  },
  placement: {
    newPlacementLabel: /^New placement$/i,
    existingPlacementLabel: /^Existing placement$/i,
  },
  nextButtonLabel: /^Next$/i,
  /** Multi-doc sync YAML: Policy, Placement, PlacementBinding. */
  yamlPatterns: {
    defaultTolerationsSynced:
      /kind:\s*Policy[\s\S]*kind:\s*Placement[\s\S]*cluster\.open-cluster-management\.io\/unreachable[\s\S]*operator:\s*Exists[\s\S]*cluster\.open-cluster-management\.io\/unavailable[\s\S]*operator:\s*Exists[\s\S]*kind:\s*PlacementBinding/,
    ...PLACEMENT_TOLERATIONS_YAML_PATTERNS,
  },
  testData: {
    namePrefix: 'policy-tolerations',
  },
} as const;

/** Policy create wizard — Placement cluster preview UI (RHACM4K-64221; data in e2e-spec-data). */
export const POLICY_PLACEMENT_PREVIEW = {
  ...PLACEMENT_CLUSTER_PREVIEW,
  placementStepNavId: 'placement',
  reviewStepNavId: 'review-step',
  stepsNavAriaLabel: 'Policy steps',
  placement: {
    ...PLACEMENT_CLUSTER_PREVIEW.placement,
    /** Hub PF Select — aria-label is "Select the cluster sets", not "Cluster sets". */
    clusterSetsComboboxLabel: /^Select the cluster sets$/i,
    existingPlacementComboboxLabel: /^Placement$/i,
  },
} as const;

export const POLICY_SET_LIST = {
  policySetsTabLabel: /^Policy sets$/i,
  createPolicySetLinkLabel: /^Create policy set$/i,
} as const;

/** Policy set create wizard — Placement cluster preview UI (RHACM4K-64222; data in e2e-spec-data). */
export const POLICY_SET_PLACEMENT_PREVIEW = {
  ...PLACEMENT_CLUSTER_PREVIEW,
  placementStepNavId: 'placement-step',
  reviewStepNavId: 'review-step',
  stepsNavAriaLabel: 'Policy set steps',
  placement: {
    ...PLACEMENT_CLUSTER_PREVIEW.placement,
    clusterSetsComboboxLabel: /^Select the cluster sets$/i,
    existingPlacementComboboxLabel: /^Placement$/i,
  },
} as const;

export const POLICY_SET_CREATE_WIZARD = {
  pageTitle: /^Create policy set$/i,
  contentAriaLabel: 'Policy set content',
  stepsNavAriaLabel: 'Policy set steps',
  detailsStepId: 'details-step',
  policiesStepId: 'policies-step',
  placementStepNavId: 'placement-step',
  placement: {
    newPlacementLabel: /^New placement$/i,
    existingPlacementLabel: /^Existing placement$/i,
  },
  details: {
    nameTextboxLabel: /^Name$/i,
    namePlaceholder: 'Enter the name',
    namespaceComboboxLabel: /Select the namespace/i,
  },
  nextButtonLabel: /^Next$/i,
  /** Multi-doc sync YAML: PolicySet, Placement, PlacementBinding (no numberOfClusters on Placement). */
  yamlPatterns: {
    defaultTolerationsSynced:
      /kind: PolicySet[\s\S]*kind: Placement[\s\S]*cluster\.open-cluster-management\.io\/unreachable[\s\S]*operator:\s*Exists[\s\S]*cluster\.open-cluster-management\.io\/unavailable[\s\S]*operator:\s*Exists[\s\S]*kind: PlacementBinding/,
    policySetAndPlacementBinding:
      /kind: PolicySet[\s\S]*kind: PlacementBinding/,
    ...PLACEMENT_TOLERATIONS_YAML_PATTERNS,
  },
  testData: {
    namePrefix: 'policy-set-tolerations',
  },
} as const;

// =============================================================================
// Routes (governance detail pages — from main)
// =============================================================================

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
