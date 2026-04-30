/**
 * Shared test logic: assertions, factories, and other non-page, non-service code.
 * Add modules under `assertions/`, `factories/`, etc. as the suite grows.
 *
 * @see docs/architecture-overview.md — §5 `/src/lib` (application helpers under `./app/`)
 */

export {
  createSubscription,
  type AutomationSpec,
  type ClusterDeploymentSpec,
  type ClusterLabelSelectorRowSpec,
  type CreateSubscriptionOptions,
  type GitSubscriptionRepositoryFields,
  type HelmSubscriptionRepositoryFields,
  type ObjectStorageSubscriptionRepositoryFields,
  type PerBlockSubscriptionSpec,
  type SubscriptionRepositorySpec,
  type TimeWindowSpec,
} from './app/subscription-create';

export {
  getManagedClusterContextPath,
  getPrimaryManagedCluster,
  loadManagedClusterContext,
  type ManagedClusterContextFile,
  type ManagedClusterEntry,
} from './cluster/managedClusterContext';

export {
  buildMergedTopologyDrawerSpotChecksForSubscriptionBlocks,
  buildMergedTopologyNodeDataIdsForSubscriptionBlocks,
  buildTopologyDrawerSpotChecksForSubscriptionBlock,
  buildTopologyNodeDataIdsForSubscriptionBlock,
  dedupeTopologyNodeDataIds,
  defaultChannelCrName,
  defaultPlacementCrName,
  defaultSubscriptionCrName,
  expectedTopologyDrawerContains,
  expectApplicationDetailsUrl,
  expectApplicationTopologyUrl,
  expectOpenShiftShellTitle,
  expectTopologyGraphContainsNodeDataIds,
  expectVisibleTopologyDrawerContains,
  topologyApplicationDataId,
  topologyClusterHubDataId,
  topologyDeployedDeploymentDataId,
  topologyDeployedPodDataId,
  topologyDeployedReplicaSetDataId,
  topologyDeployedRouteDataId,
  topologyDeployedServiceDataId,
  topologyPlacementDecisionDataId,
  topologySubscriptionDataId,
  TOPOLOGY_GRAPH_SURFACE_TEST_ID,
  type TopologyClusterResourceRef,
} from './app/topology-graph';

export {
  subscriptionDetailsClustersValuePattern,
  verifySubscriptionAppDetailsTab,
  type SubscriptionDetailsClustersSummary,
  type SubscriptionDetailsRepositoryExpectation,
  type VerifySubscriptionAppDetailsTabParams,
} from './app/verify-subscription-details';
export {
  verifySubscriptionAppTopologyTab,
  type TopologyDrawerSpotCheck,
  type TopologySubscriptionScopeParam,
  type VerifySubscriptionAppTopologyTabParams,
} from './app/verify-subscription-topology';
