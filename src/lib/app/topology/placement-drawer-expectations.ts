/** **PlacementDecision** topology drawer expectations. */

/** Fields asserted on the **PlacementDecision** drawer. */
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

/** Global cluster set drawer — label values checked as subset (contain), not exact list. */
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

/** After editDeployOnAll — drawer shows managed cluster name only among label values. */
export function managedClusterOnlyPlacementDrawerExpectation(
  managedClusterName: string,
  matchedClusterCount = 2
): PlacementDecisionDrawerExpectation {
  return globalClusterPlacementDrawerExpectation({
    matchedClusterCount,
    labelValues: [managedClusterName],
  });
}
