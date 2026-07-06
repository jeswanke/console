/** ACM Overview page routes and UI strings. */

export const OVERVIEW_ROUTES = {
  page: '/multicloud/home/overview',
} as const;

export const OVERVIEW_PAGE = {
  title: 'Overview',

  clusterSelector: {
    clusterLabelKeyInputId: 'cluster-label-key',
    clusterLabelValueInputId: 'cluster-label-value',
    localClusterLabel: 'local-cluster',
    localClusterValue: 'true',
  },

  summary: {
    clustersCardTitle: 'Clusters',
    appTypesCardTitle: 'Application types',
    policiesCardTitle: 'Policies',
    clusterVersionCardTitle: 'Cluster version',
    nodesCardTitle: 'Nodes',
    workerCoreCountCardTitle: 'Worker core count',
  },

  insights: {
    sectionLabel: 'Insights',
    clusterRecommendationCardTitle: 'Cluster recommendations',
    upgradeRiskPredictionCardTitle: 'Update risk predictions',
  },

  clusterHealth: {
    sectionLabel: 'Cluster health',
    statusCardTitle: 'Status',
    violationsCardTitle: 'Violations',
    clusterAddonsCardTitle: 'Cluster add-ons',
  },
} as const;
