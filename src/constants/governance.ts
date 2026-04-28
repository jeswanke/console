/**
 * Governance (GRC) constants.
 *
 * Routes, page labels, description list field names, and text strings
 * for the Governance area. Used by governance page objects and tests.
 */

// =============================================================================
// Routes
// =============================================================================

export const GOV_ROUTES = {
  policies: '/multicloud/governance/policies',
  discoveredPolicies: '/multicloud/governance/discovered',
  discoveredByCluster: (
    apiGroup: string,
    apiVersion: string,
    kind: string,
    policyName: string,
  ) =>
    `/multicloud/governance/discovered/${apiGroup}/${apiVersion}/${kind}/${policyName}`,
  discoveredPolicyDetails: (
    apiGroup: string,
    apiVersion: string,
    kind: string,
    templateName: string,
    templateNamespace: string,
    clusterName: string,
  ) =>
    `/multicloud/governance/discovered/${apiGroup}/${apiVersion}/${kind}/${templateName}/${templateNamespace}/${clusterName}/detail`,
  policyDetailsResults: (namespace: string, name: string) =>
    `/multicloud/governance/policies/details/${namespace}/${name}/results`,
  policyTemplateDetails: (
    namespace: string,
    name: string,
    clusterName: string,
    apiGroup: string,
    apiVersion: string,
    kind: string,
    templateName: string,
  ) =>
    `/multicloud/governance/policies/details/${namespace}/${name}/template/${clusterName}/${apiGroup}/${apiVersion}/${kind}/${templateName}`,
} as const;

// =============================================================================
// Page structure
// =============================================================================

export const GOV_PAGE = {
  tabs: {
    policies: 'Policies',
    discoveredPolicies: 'Discovered policies',
  },
} as const;

export const GOV_DISCOVERED_DETAILS = {
  tabs: {
    relatedResources: 'Related resources',
    clusters: 'Clusters',
  },
} as const;

export const GOV_TEMPLATE_DETAILS = {
  sectionId: 'template-details-section',
  fields: {
    name: 'Name',
    namespace: 'Namespace',
    engine: 'Engine',
    cluster: 'Cluster',
    kind: 'Kind',
    apiVersion: 'API version',
    labels: 'Labels',
  },
} as const;

export const GOV_POLICY_DETAILS = {
  tabs: {
    details: 'Details',
    results: 'Results',
  },
} as const;

export const GOV_LABELS = {
  filterButtonName: 'Label',
  noLabels: '-',
} as const;
