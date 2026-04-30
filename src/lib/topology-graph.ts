/**
 * ACM subscription-app **topology** graph: stable `data-id` values on `g[data-kind=node]` inside
 * `[data-test-id="topology"]` (PF topology surface). Captured with **Playwriter** against a live hub
 * (`auto-git-multi` / `auto-git-multi-ns`).
 *
 * @see {@link APP_APPLICATION_TOPOLOGY.graphSurfaceTestId}
 */

import { expect, type Locator, type Page } from '@playwright/test';

import { APP_APPLICATION_DETAILS, APP_APPLICATION_TOPOLOGY } from '@constants/app';

/** Re-export for callers that need the raw test id string. */
export const TOPOLOGY_GRAPH_SURFACE_TEST_ID = APP_APPLICATION_TOPOLOGY.graphSurfaceTestId;

/** Default **Subscription** CR name for block *i* (1-based), matching the create wizard. */
export function defaultSubscriptionCrName(applicationName: string, blockIndex: number): string {
  return `${applicationName}-subscription-${blockIndex}`;
}

/** Default **Placement** CR name for block *i* (1-based). */
export function defaultPlacementCrName(applicationName: string, blockIndex: number): string {
  return `${applicationName}-placement-${blockIndex}`;
}

export function topologyApplicationDataId(applicationName: string): string {
  return `application--${applicationName}`;
}

export function topologySubscriptionDataId(namespace: string, subscriptionCrName: string): string {
  return `member--subscription--${namespace}--${subscriptionCrName}`;
}

/**
 * **PlacementDecision** node id (`member--rules--…`). `placementCrName` is the Placement resource name
 * (e.g. `auto-git-multi-placement-1`); the console appends `-decision-1--0` in observed hubs.
 */
export function topologyPlacementDecisionDataId(
  namespace: string,
  placementCrName: string
): string {
  return `member--rules--${namespace}--${placementCrName}-decision-1--0`;
}

export function topologyClusterHubDataId(clusterName: string, subscriptionCrName: string): string {
  return `member--clusters--${clusterName}--${subscriptionCrName}`;
}

function deployedResourcePrefix(subscriptionCrName: string, namespace: string): string {
  return `member--deployed-resource--member--clusters--local-cluster--${subscriptionCrName}--${namespace}--`;
}

export function topologyDeployedRouteDataId(
  subscriptionCrName: string,
  namespace: string,
  routeName: string
): string {
  return `${deployedResourcePrefix(subscriptionCrName, namespace)}${routeName}--route`;
}

export function topologyDeployedDeploymentDataId(
  subscriptionCrName: string,
  namespace: string,
  deploymentName: string
): string {
  return `${deployedResourcePrefix(subscriptionCrName, namespace)}${deploymentName}--deployment`;
}

export function topologyDeployedReplicaSetDataId(
  subscriptionCrName: string,
  namespace: string,
  deploymentName: string,
  replicaSetName: string
): string {
  return `${deployedResourcePrefix(subscriptionCrName, namespace)}${deploymentName}--deployment--replicaset--${replicaSetName}`;
}

export function topologyDeployedPodDataId(
  subscriptionCrName: string,
  namespace: string,
  deploymentName: string,
  replicaSetName: string,
  podStem: string
): string {
  return `${deployedResourcePrefix(subscriptionCrName, namespace)}${deploymentName}--deployment--replicaset--${replicaSetName}--pod--${podStem}`;
}

export function topologyDeployedServiceDataId(
  subscriptionCrName: string,
  namespace: string,
  serviceName: string
): string {
  return `${deployedResourcePrefix(subscriptionCrName, namespace)}${serviceName}--service`;
}

export type TopologyClusterResourceRef = { kind: string; name: string };

/**
 * Builds the **node** `data-id` list for one subscription repo block (first channel + placement + local-cluster
 * deployables), matching Playwriter output for `auto_git_multi` block 0.
 */
export function buildTopologyNodeDataIdsForSubscriptionBlock(params: {
  applicationName: string;
  namespace: string;
  /** 1-based block index (wizard subscription / placement numbering). */
  blockIndex: number;
  /** Spoke cluster name in the graph (default `local-cluster`). */
  clusterName?: string;
  /** Rows from `applicationExpectations.clusterResources[blockIndex - 1]` (Route, Deployment, …). */
  clusterResourceRows: TopologyClusterResourceRef[];
}): string[] {
  const cluster = params.clusterName ?? 'local-cluster';
  const i = params.blockIndex;
  const subName = defaultSubscriptionCrName(params.applicationName, i);
  const placementName = defaultPlacementCrName(params.applicationName, i);

  const ids: string[] = [
    topologyApplicationDataId(params.applicationName),
    topologySubscriptionDataId(params.namespace, subName),
    topologyPlacementDecisionDataId(params.namespace, placementName),
    topologyClusterHubDataId(cluster, subName),
  ];

  const deploymentName = params.clusterResourceRows.find(
    (r) => r.kind.toLowerCase() === 'deployment'
  )?.name;
  const replicaSetName = params.clusterResourceRows.find(
    (r) => r.kind.toLowerCase() === 'replicaset'
  )?.name;

  for (const row of params.clusterResourceRows) {
    const k = row.kind.toLowerCase();
    if (k === 'route') {
      ids.push(topologyDeployedRouteDataId(subName, params.namespace, row.name));
    } else if (k === 'deployment') {
      ids.push(topologyDeployedDeploymentDataId(subName, params.namespace, row.name));
    } else if (k === 'service') {
      ids.push(topologyDeployedServiceDataId(subName, params.namespace, row.name));
    } else if (k === 'replicaset') {
      if (!deploymentName) {
        throw new Error('topology-graph: ReplicaSet row requires a Deployment row in the same block');
      }
      ids.push(
        topologyDeployedReplicaSetDataId(subName, params.namespace, deploymentName, row.name)
      );
    } else if (k === 'pod') {
      if (!deploymentName || !replicaSetName) {
        throw new Error(
          'topology-graph: Pod row requires Deployment and ReplicaSet rows in the same block'
        );
      }
      ids.push(
        topologyDeployedPodDataId(
          subName,
          params.namespace,
          deploymentName,
          replicaSetName,
          row.name
        )
      );
    }
  }

  return ids;
}

/**
 * Drawer text to assert after clicking a graph **node** (`data-id`), from **Playwriter** hub capture
 * (`auto-git-multi` topology). The **cluster** hub node has no `Type: Cluster` line — match **`Clusters (n)`** with a regex.
 */
export function expectedTopologyDrawerContains(nodeDataId: string): string | RegExp {
  if (nodeDataId.startsWith('application--')) {
    return 'Type: Application';
  }
  if (nodeDataId.includes('member--subscription--')) {
    return 'Type: Subscription';
  }
  if (nodeDataId.includes('member--rules--')) {
    return 'Type: PlacementDecision';
  }
  if (nodeDataId.includes('member--clusters--') && !nodeDataId.includes('member--deployed-resource--')) {
    return /Clusters \(\d+\)/;
  }
  if (nodeDataId.includes('--pod--')) {
    return 'Type: Pod';
  }
  if (nodeDataId.includes('--replicaset--')) {
    return 'Type: Replicaset';
  }
  if (nodeDataId.endsWith('--service')) {
    return 'Type: Service';
  }
  if (nodeDataId.endsWith('--route')) {
    return 'Type: Route';
  }
  if (nodeDataId.endsWith('--deployment')) {
    return 'Type: Deployment';
  }
  throw new Error(`topology-graph: no drawer expectation for node data-id: ${nodeDataId}`);
}

/**
 * Builds **click + drawer** checks for every node id from {@link buildTopologyNodeDataIdsForSubscriptionBlock}
 * (same order as that list).
 */
export function buildTopologyDrawerSpotChecksForSubscriptionBlock(
  params: Parameters<typeof buildTopologyNodeDataIdsForSubscriptionBlock>[0]
): { nodeDataId: string; drawerContains: string | RegExp }[] {
  const nodeDataIds = buildTopologyNodeDataIdsForSubscriptionBlock(params);
  return nodeDataIds.map((nodeDataId) => ({
    nodeDataId,
    drawerContains: expectedTopologyDrawerContains(nodeDataId),
  }));
}

/** Dedupe **`data-id`**s while preserving first-seen order (e.g. merge multi-block topology). */
export function dedupeTopologyNodeDataIds(dataIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of dataIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function buildMergedTopologyNodeDataIdsForSubscriptionBlocks(params: {
  applicationName: string;
  namespace: string;
  blocks: { blockIndex: number; clusterResourceRows: TopologyClusterResourceRef[] }[];
}): string[] {
  const merged: string[] = [];
  for (const b of params.blocks) {
    merged.push(
      ...buildTopologyNodeDataIdsForSubscriptionBlock({
        applicationName: params.applicationName,
        namespace: params.namespace,
        blockIndex: b.blockIndex,
        clusterResourceRows: b.clusterResourceRows,
      })
    );
  }
  return dedupeTopologyNodeDataIds(merged);
}

export function buildMergedTopologyDrawerSpotChecksForSubscriptionBlocks(params: {
  applicationName: string;
  namespace: string;
  blocks: { blockIndex: number; clusterResourceRows: TopologyClusterResourceRef[] }[];
}): { nodeDataId: string; drawerContains: string | RegExp }[] {
  const seen = new Set<string>();
  const out: { nodeDataId: string; drawerContains: string | RegExp }[] = [];
  for (const b of params.blocks) {
    const checks = buildTopologyDrawerSpotChecksForSubscriptionBlock({
      applicationName: params.applicationName,
      namespace: params.namespace,
      blockIndex: b.blockIndex,
      clusterResourceRows: b.clusterResourceRows,
    });
    for (const c of checks) {
      if (seen.has(c.nodeDataId)) continue;
      seen.add(c.nodeDataId);
      out.push(c);
    }
  }
  return out;
}

function regexEscapePathSegment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Asserts the browser is on the application **Details** tab URL (path segment `details`, optional query).
 */
export async function expectApplicationDetailsUrl(
  page: Page,
  namespace: string,
  applicationName: string,
  options?: { timeout?: number }
): Promise<void> {
  const slug = APP_APPLICATION_DETAILS.tabs.details.slug;
  const re = new RegExp(
    `/multicloud/applications/details/${regexEscapePathSegment(namespace)}/${regexEscapePathSegment(applicationName)}/${slug}(\\?|$)`
  );
  await expect(page).toHaveURL(re, options);
}

/**
 * Asserts the browser is on the application **Topology** tab URL (path segment `topology`, optional query).
 */
export async function expectApplicationTopologyUrl(
  page: Page,
  namespace: string,
  applicationName: string
): Promise<void> {
  const slug = APP_APPLICATION_DETAILS.tabs.topology.slug;
  const re = new RegExp(
    `/multicloud/applications/details/${regexEscapePathSegment(namespace)}/${regexEscapePathSegment(applicationName)}/${slug}(\\?|$)`
  );
  await expect(page).toHaveURL(re);
}

/** Weak smoke: console shell title (same on many pages). */
export async function expectOpenShiftShellTitle(page: Page): Promise<void> {
  await expect(page).toHaveTitle(/OpenShift/i);
}

/**
 * Poll until every **`data-id`** exists under the topology surface (graph can hydrate after navigation).
 */
export async function expectTopologyGraphContainsNodeDataIds(
  surface: Locator,
  dataIds: string[],
  options?: { timeout?: number; intervals?: number[] }
): Promise<void> {
  const timeout = options?.timeout ?? 120_000;
  await expect
    .poll(
      async () => {
        const missing: string[] = [];
        for (const id of dataIds) {
          const n = await surface
            .locator(`g[data-kind=node][data-type=node][data-id="${id}"]`)
            .count();
          if (n === 0) missing.push(id);
        }
        return missing;
      },
      { timeout, intervals: options?.intervals ?? [2_000, 3_000, 5_000] }
    )
    .toEqual([]);
}

/**
 * Asserts some **visible** `drawer__panel` contains the given text (resource side panel after a graph node click).
 */
export async function expectVisibleTopologyDrawerContains(
  page: Page,
  pattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30_000;
  await expect
    .poll(
      async () => {
        const panels = page.locator('[class*="drawer__panel"]');
        const n = await panels.count();
        for (let i = 0; i < n; i++) {
          const panel = panels.nth(i);
          if (!(await panel.isVisible().catch(() => false))) continue;
          const text = await panel.innerText().catch(() => '');
          const ok =
            typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
          if (ok) return true;
        }
        return false;
      },
      { timeout, message: 'Expected a visible topology drawer panel with matching text' }
    )
    .toBe(true);
}
