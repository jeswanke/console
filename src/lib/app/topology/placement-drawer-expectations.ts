/**
 * **PlacementDecision** topology drawer expectations (Cypress `validatePlacementTopology`).
 */

/** Cypress `validatePlacementTopology` — fields asserted on the **PlacementDecision** drawer. */
export type PlacementDecisionDrawerExpectation = {
  matchedClusterCount: number;
  clusterSet?: string;
  labelSelector?: { key: string; values: string[] };
};

const DEFAULT_LABEL_KEY = 'name';
const DEFAULT_CLUSTER_SET = 'global';

/** After create with `placement_label_local` — one matched cluster (`local-cluster`). */
export function localClusterPlacementDrawerExpectation(): PlacementDecisionDrawerExpectation {
  return {
    matchedClusterCount: 1,
    clusterSet: DEFAULT_CLUSTER_SET,
    labelSelector: { key: DEFAULT_LABEL_KEY, values: ['local-cluster'] },
  };
}

/**
 * Global cluster set placement drawer (subset label value checks, Cypress `.should('contain', value)`).
 */
export function globalClusterPlacementDrawerExpectation(params: {
  matchedClusterCount: number;
  labelValues: string[];
  clusterSet?: string;
  labelKey?: string;
}): PlacementDecisionDrawerExpectation {
  return {
    matchedClusterCount: params.matchedClusterCount,
    clusterSet: params.clusterSet ?? DEFAULT_CLUSTER_SET,
    labelSelector: {
      key: params.labelKey ?? DEFAULT_LABEL_KEY,
      values: params.labelValues,
    },
  };
}

/** Second pass after `editDeployOnAll` — Cypress checks managed cluster name only in the drawer. */
export function managedClusterOnlyPlacementDrawerExpectation(
  managedClusterName: string,
  matchedClusterCount = 2
): PlacementDecisionDrawerExpectation {
  return globalClusterPlacementDrawerExpectation({
    matchedClusterCount,
    labelValues: [managedClusterName],
  });
}
