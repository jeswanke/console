/**
 * Infrastructure → Clusters → Placements and standalone **Create placement** wizard.
 */
import {
  PLACEMENT_DEFAULT_TOLERATIONS,
  PLACEMENT_SYNC_EDITOR,
  PLACEMENT_TOLERATIONS_UI,
  PLACEMENT_TOLERATIONS_YAML_PATTERNS,
} from '@constants/placement-tolerations';

export { PLACEMENT_DEFAULT_TOLERATIONS };

export const PLACEMENT_ROUTES = {
  placementsList: '/multicloud/infrastructure/clusters/placements',
  createPlacement: '/multicloud/infrastructure/clusters/placements/create',
  /** Placement details → Overview tab (live hub / Playwriter). */
  detailsOverview: (namespace: string, name: string) =>
    `/multicloud/infrastructure/clusters/placements/details/${namespace}/${name}/overview`,
} as const;

/** Placement details Overview tab — expandable sections and DescriptionList terms (live hub). */
export const PLACEMENT_DETAILS = {
  tabs: {
    overview: { label: 'Overview', slug: 'overview' as const },
  },
  breadcrumb: {
    placements: 'Placements',
  },
  sections: {
    details: 'Details',
    usedIn: 'Used in',
    placementDecisions: 'PlacementDecisions',
    conditions: 'Conditions',
  },
  /** PF DescriptionList **term** labels on the Details card. */
  descriptionTerms: {
    name: 'Name',
    namespace: 'Namespace',
    clusterSets: 'Cluster sets',
    filters: 'Filters',
    selectedClusters: 'Selected clusters',
    usedIn: 'Used in',
    lastUpdated: 'Last updated',
  },
  usedInTable: {
    heading: 'Applications',
    columns: {
      name: 'Name',
      type: 'Type',
      namespace: 'Namespace',
    },
    typeApplicationSet: 'ApplicationSet',
  },
  placementDecisionsTable: {
    columns: {
      name: 'Name',
      namespace: 'Namespace',
      clusters: 'Clusters',
    },
  },
  conditionsTable: {
    columns: {
      type: 'Type',
      status: 'Status',
      updated: 'Updated',
      reason: 'Reason',
      message: 'Message',
    },
    placementSatisfied: {
      type: 'PlacementSatisfied',
      status: 'True',
      reason: 'AllDecisionsScheduled',
    },
  },
  /** Expandable section toggle id shared across Overview cards (live hub). */
  sectionToggleId: 'toggle-button',
} as const;

export const PLACEMENT_LIST = {
  placementsTabLabel: /^Placements$/i,
  createPlacementButtonLabel: /^Create placement$/i,
} as const;

export const PLACEMENT_CREATE_WIZARD = {
  pageTitle: /^Create placement$/i,
  ...PLACEMENT_SYNC_EDITOR,
  limitClustersCheckboxIdSuffix: 'limit-clusters-checkbox',
  steps: {
    general: /^General$/i,
    placement: /^Placement$/i,
  },
  tolerations: PLACEMENT_TOLERATIONS_UI,
  testData: {
    namespace: 'placement-tolerations-e2e',
    namePrefix: 'placement-tolerations',
  },
  yamlPatterns: {
    defaultTolerationsSynced:
      /kind: Placement[\s\S]*cluster\.open-cluster-management\.io\/unreachable[\s\S]*operator:\s*Exists[\s\S]*cluster\.open-cluster-management\.io\/unavailable[\s\S]*operator:\s*Exists[\s\S]*numberOfClusters:\s*1/,
    defaultNumberOfClusters: /numberOfClusters:\s*1/,
    ...PLACEMENT_TOLERATIONS_YAML_PATTERNS,
  },
} as const;
