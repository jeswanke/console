/**
 * Governance — create wizards (RHACM4K-64217/64218/64221/64222) and detail-page constants (main).
 */
import { PLACEMENT_CLUSTER_PREVIEW } from '@constants/placement-preview';
import { PLACEMENT_TOLERATIONS_YAML_PATTERNS } from '@constants/placement-tolerations';

export const GOV_ROUTES = {
  governance: '/multicloud/governance',
  policyDetails: (namespace: string, name: string) =>
    `/multicloud/governance/policies/details/${namespace}/${name}`,
  discoveredPolicyDetails: (clusterName: string, policyName: string) =>
    `/multicloud/governance/discovered-policies/details/local-cluster/${clusterName}.${policyName}`,
  policyTemplateDetails: (namespace: string, policyName: string, templateName: string) =>
    `/multicloud/governance/policies/details/${namespace}/${policyName}/template/${templateName}`,
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
    existingPlacementComboboxLabel: /^Select the placement$/i,
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
    existingPlacementComboboxLabel: /^Select the placement$/i,
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
    policySetAndPlacementBinding: /kind: PolicySet[\s\S]*kind: PlacementBinding/,
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

// =============================================================================
// Policies table — columns, filters, toolbar (Batch 1: table infrastructure)
// =============================================================================

export const GOV_TABLE_COLUMNS = {
  name: 'Name',
  namespace: 'Namespace',
  clusterViolations: 'Cluster violations',
  status: 'Status',
  remediation: 'Remediation',
  policySet: 'Policy set',
  source: 'Source',
  automation: 'Automation',
  created: 'Created',
} as const;

/** Accessible name from stolostron/console AcmTable (`t('Policies table')`, ACM-5264). */
export const GOV_TABLE = {
  ariaLabel: 'Policies table',
  role: 'grid' as const,
} as const;

export const GOV_TABLE_MANAGE_COLUMNS = {
  defaultChecked: [
    GOV_TABLE_COLUMNS.name,
    GOV_TABLE_COLUMNS.namespace,
    GOV_TABLE_COLUMNS.clusterViolations,
    GOV_TABLE_COLUMNS.remediation,
    GOV_TABLE_COLUMNS.policySet,
    GOV_TABLE_COLUMNS.source,
  ] as readonly string[],
  defaultUnchecked: [
    GOV_TABLE_COLUMNS.status,
    GOV_TABLE_COLUMNS.automation,
    GOV_TABLE_COLUMNS.created,
  ] as readonly string[],
  required: [
    GOV_TABLE_COLUMNS.name,
    GOV_TABLE_COLUMNS.namespace,
    GOV_TABLE_COLUMNS.clusterViolations,
  ] as readonly string[],
  optional: [
    GOV_TABLE_COLUMNS.remediation,
    GOV_TABLE_COLUMNS.policySet,
    GOV_TABLE_COLUMNS.source,
  ] as readonly string[],
} as const;

export const GOV_FILTER = {
  filterButtonLabel: 'Filter',
} as const;

export const GOV_TOOLBAR = {
  exportButtonAriaLabel: 'export-search-result',
  clearAllFiltersButtonName: 'Clear all filters',
  exportAllToCSVLabel: 'Export all to CSV',
} as const;

export const GOV_POLICY_ACTIONS = {
  actionsDropdownId: 'table-actions-dropdown',
  statusGroupId: 'status',
  remediationGroupId: 'remediation-policy',
  actions: {
    enable: 'Enable',
    disable: 'Disable',
    inform: 'Inform',
    enforce: 'Enforce',
    delete: 'Delete',
    edit: 'Edit',
  },
} as const;

// =============================================================================
// Batch 1 test resources
// =============================================================================

export const GOV_FILTER_TEST_RESOURCES = {
  policyPrefix: 'test-bulk-action',
  namespace: 'default',
} as const;

export const GOV_MANAGE_COLUMNS_TEST_RESOURCES = {
  policyPrefix: 'test-manage-columns',
  namespace: 'default',
} as const;

export const GOV_EXPORT_CSV_TEST_RESOURCES = {
  policyPrefix: 'settest',
  policySetPrefix: 'test-policyset',
  namespace: 'default',
} as const;

// =============================================================================
// Batch 2 test resources
// =============================================================================

export const GOV_BULK_ACTION_TEST_RESOURCES = {
  policyPrefix: 'test-bulk-action',
  namespace: 'default',
} as const;

export const GOV_POLICY_PLACEMENT_TEST_RESOURCES = {
  policyPrefix: 'plc-placement',
  namespace: 'open-cluster-management-global-set',
  clusterSet: 'global',
} as const;

export const GOV_NS_LABELSELECTOR_TEST_RESOURCES = {
  policyPrefix: 'test-pod-policy-14942',
  namespace: 'default',
  targetNamespace: 'auto-policy-test-1',
} as const;
