/**
 * Governance — Policy / Policy set lists and create wizards (RHACM4K-64217, RHACM4K-64218).
 */
import { PLACEMENT_CLUSTER_PREVIEW } from '@constants/placement-preview';
import { PLACEMENT_TOLERATIONS_YAML_PATTERNS } from '@constants/placement-tolerations';

export const GOVERNANCE_ROUTES = {
  governanceOverview: '/multicloud/governance',
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

/** Policy create wizard — Placement cluster preview (RHACM4K policy flow; see ACM-33679 / ACM-33680). */
export const POLICY_PLACEMENT_PREVIEW = {
  ...PLACEMENT_CLUSTER_PREVIEW,
  setupYamlRelativePath: 'src/templates/governance/policy-preview-test-setup.yaml',
  namespace: 'policy-preview-test-ns',
  clusterSet: 'policy-test-cluster-set',
  existingPlacementName: 'policy-preview-test-placement',
  placementStepNavId: 'placement',
  reviewStepNavId: 'review-step',
  stepsNavAriaLabel: 'Policy steps',
  placement: {
    ...PLACEMENT_CLUSTER_PREVIEW.placement,
    existingPlacementComboboxLabel: /^Placement$/i,
  },
  testData: {
    namePrefix: 'policy-placement-preview',
  },
} as const;

export const POLICY_SET_LIST = {
  policySetsTabLabel: /^Policy sets$/i,
  createPolicySetLinkLabel: /^Create policy set$/i,
} as const;

/** Policy set create wizard — Placement cluster preview (RHACM4K-64222; see ACM-33679 / ACM-33680). */
export const POLICY_SET_PLACEMENT_PREVIEW = {
  ...PLACEMENT_CLUSTER_PREVIEW,
  setupYamlRelativePath: 'src/templates/governance/policy-set-preview-test-setup.yaml',
  namespace: 'policyset-preview-test-ns',
  clusterSet: 'policyset-test-cluster-set',
  existingPlacementName: 'policyset-existing-placement-test',
  placementStepNavId: 'placement-step',
  reviewStepNavId: 'review-step',
  stepsNavAriaLabel: 'Policy set steps',
  placement: {
    ...PLACEMENT_CLUSTER_PREVIEW.placement,
    existingPlacementComboboxLabel: /^Placement$/i,
  },
  testData: {
    namePrefix: 'policyset-placement-preview',
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
