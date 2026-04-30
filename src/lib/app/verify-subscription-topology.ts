/**
 * **Topology** tab verification for a subscription application: graph `data-id`s, scope menu, drawer checks.
 * Composes {@link topology-graph} builders with {@link ApplicationDetailsPage}.
 *
 * @see {@link verifySubscriptionAppDetailsTab} for the **Details** tab step after Create.
 */

import { expect, type Page } from '@playwright/test';

import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';

import {
  buildMergedTopologyDrawerSpotChecksForSubscriptionBlocks,
  buildMergedTopologyNodeDataIdsForSubscriptionBlocks,
  buildTopologyDrawerSpotChecksForSubscriptionBlock,
  buildTopologyNodeDataIdsForSubscriptionBlock,
  expectApplicationTopologyUrl,
  expectOpenShiftShellTitle,
  type TopologyClusterResourceRef,
} from './topology-graph';

export type TopologyDrawerSpotCheck = {
  /** `g[data-kind=node][data-id=…]` value to click. */
  nodeDataId: string;
  /** Substring or regex matched against the **visible** topology drawer panel text. */
  drawerContains: string | RegExp;
};

export type TopologySubscriptionScopeParam =
  | 'all'
  /** Subscription CR name (e.g. `app-subscription-1`) — must match `menuitem` label. */
  | { subscriptionCrName: string };

export type VerifySubscriptionAppTopologyTabParams = {
  page: Page;
  detailsPage: ApplicationDetailsPage;
  applicationName: string;
  namespace: string;
  /**
   * Single block (default): `clusterResources[blockIndex - 1]` shape.
   * Omit when {@link mergedSubscriptionBlocks} is set.
   */
  blockIndex?: number;
  clusterResourceRows?: TopologyClusterResourceRef[];
  /**
   * Multi-repo / multi-subscription: merge node `data-id`s and drawer checks across blocks.
   * When set, use with {@link subscriptionScope} **`'all'`** so every subscription tree is visible (Playwriter).
   */
  mergedSubscriptionBlocks?: { blockIndex: number; clusterResourceRows: TopologyClusterResourceRef[] }[];
  /**
   * Topology **`#comboChannel`** PF6 MenuToggle — only rendered when **more than one** subscription/repo exists.
   * When {@link mergedSubscriptionBlocks} has **two or more** entries, pass **`'all'`** (or a subscription CR) so
   * the graph shows the right scope; if omitted in that case, defaults to **`'all'`**.
   */
  subscriptionScope?: TopologySubscriptionScopeParam;
  /** Poll until all graph node `data-id`s exist (default 120s). */
  nodeHydrationTimeout?: number;
  /** Optional: click nodes and assert side-panel content (defaults to full block / merged builder when omitted). */
  drawerSpotChecks?: TopologyDrawerSpotCheck[];
};

/**
 * Opens **Topology**, asserts URL / title / graph chrome, **`#comboChannel`** only when multi-repo merged blocks,
 * polls until expected **node** `data-id`s exist, then runs **drawer** spot checks.
 */
export async function verifySubscriptionAppTopologyTab(
  params: VerifySubscriptionAppTopologyTabParams
): Promise<void> {
  const {
    page,
    detailsPage,
    applicationName,
    namespace,
    nodeHydrationTimeout = 120_000,
    drawerSpotChecks: drawerSpotChecksParam,
    subscriptionScope,
  } = params;

  const merged = params.mergedSubscriptionBlocks;
  let topologyDataIds: string[];
  let drawerSpotChecks: TopologyDrawerSpotCheck[];

  if (merged && merged.length > 0) {
    topologyDataIds = buildMergedTopologyNodeDataIdsForSubscriptionBlocks({
      applicationName,
      namespace,
      blocks: merged,
    });
    drawerSpotChecks =
      drawerSpotChecksParam ??
      buildMergedTopologyDrawerSpotChecksForSubscriptionBlocks({
        applicationName,
        namespace,
        blocks: merged,
      });
  } else {
    const { blockIndex, clusterResourceRows } = params;
    if (blockIndex === undefined || clusterResourceRows === undefined) {
      throw new Error(
        'verifySubscriptionAppTopologyTab: pass blockIndex + clusterResourceRows, or mergedSubscriptionBlocks'
      );
    }
    topologyDataIds = buildTopologyNodeDataIdsForSubscriptionBlock({
      applicationName,
      namespace,
      blockIndex,
      clusterResourceRows,
    });
    drawerSpotChecks =
      drawerSpotChecksParam ??
      buildTopologyDrawerSpotChecksForSubscriptionBlock({
        applicationName,
        namespace,
        blockIndex,
        clusterResourceRows,
      });
  }

  await detailsPage.goto(namespace, applicationName, 'topology');
  await expectOpenShiftShellTitle(page);
  await expectApplicationTopologyUrl(page, namespace, applicationName);
  await expect(detailsPage.getApplicationHeading()).toHaveText(applicationName);
  await expect(detailsPage.getTopologyZoomInButton()).toBeVisible();

  const mergedBlockCount = merged?.length ?? 0;
  const hasComboChannel = mergedBlockCount > 1;

  if (hasComboChannel) {
    await expect(detailsPage.getTopologySubscriptionScopeToggle()).toBeVisible();
    const scope = subscriptionScope ?? 'all';
    if (scope === 'all') {
      await detailsPage.chooseTopologySubscriptionScopeAll();
    } else {
      await detailsPage.chooseTopologySubscriptionScopeByCrName(scope.subscriptionCrName);
    }
  } else if (subscriptionScope !== undefined) {
    throw new Error(
      'verifySubscriptionAppTopologyTab: subscriptionScope is only used when mergedSubscriptionBlocks has more than one block (#comboChannel). For a single Git repo, omit it.'
    );
  }

  await detailsPage.expectTopologyGraphContainsNodeDataIds(topologyDataIds, {
    timeout: nodeHydrationTimeout,
  });

  for (const { nodeDataId, drawerContains } of drawerSpotChecks) {
    await detailsPage.clickTopologyGraphNodeByDataId(nodeDataId);
    await detailsPage.expectVisibleTopologyDrawerContains(drawerContains);
  }
}
