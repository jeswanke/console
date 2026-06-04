/**
 * Shared test logic: assertions, factories, and other non-page, non-service code.
 *
 * @see docs/architecture-overview.md — §5 `/src/lib`
 */

export { expectOcGetListContains } from './assertions/oc-resource-list';

export * from './app/subscription';
export * from './app/topology';
export { resolvePlacementCrNameForSubscriptionBlock } from './app/placement/resolve';
export {
  pollTopologyDrawerLabeledFieldUntil,
  waitForPlacementDecisionClusterCount,
  TOPOLOGY_DRAWER_POLL_INTERVALS,
} from './app/topology/drawer-poll';
export {
  buildClusterLabelDeployment,
  buildLocalClusterLabelDeployment,
  buildGlobalClusterLabelDeployment,
} from './app/subscription/placement-spec';

export * from './app/verify';
export * from './app/auth/private-git';
export { deleteHubApplicationIfExists } from './app/setup/application-test-setup';

export {
  getManagedClusterContextPath,
  getPrimaryManagedCluster,
  loadManagedClusterContext,
  skipUnlessPrimaryManagedCluster,
  type ManagedClusterContextFile,
  type ManagedClusterEntry,
  type PlaywrightTestSkip,
} from './cluster/managedClusterContext';
export * from './cluster';
