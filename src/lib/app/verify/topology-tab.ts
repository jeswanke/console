/**
 * Topology tab assertions for subscription applications.
 *
 * **Which helper to use**
 * - {@link verifySubscriptionAppTopologyTab} — URL/shell, graph hydration (`data-id`), optional drawers; set
 *   `assertGraphNodesSuccessStatus` for RHACM4K-41356-style green-node checks.
 * - {@link verifyTopologyGraphNodesSuccessStatus} — `pf-m-success` on known `data-id` nodes only (caller hydrates or
 *   passes ids from {@link buildTopologyNodeDataIdsForSubscriptionBlock}).
 * - {@link expectTopologyShowsDeployableTypes} — `#nodeIcon_*` or label presence (e.g. RHACM4K-10668 CRD), not status.
 *
 * Caller opens the Topology tab first unless the helper navigates via `page` + `detailsPage`.
 */

import { expect, type Locator, type Page } from '@playwright/test';

import { APP_APPLICATION_TOPOLOGY } from '@constants/app';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { OcCliService } from '@services/OcCliService';

import { resolvePlacementCrNameForSubscriptionBlock } from '../placement/resolve';
import type { PlacementDecisionDrawerExpectation } from '../topology/placement-drawer-expectations';
import {
  buildMergedTopologyDrawerSpotChecksForSubscriptionBlocks,
  buildMergedTopologyNodeDataIdsForSubscriptionBlocks,
  buildPlacementDecisionNodeDataId,
  buildTopologyDrawerSpotChecksForSubscriptionBlock,
  buildTopologyNodeDataIdsForSubscriptionBlock,
  defaultPlacementCrName,
  defaultSubscriptionCrName,
  expectApplicationTopologyUrl,
  expectOpenShiftShellTitle,
  topologyApplicationDataId,
  topologySubscriptionDataId,
  type TopologyClusterResourceRef,
} from '../topology/graph-ids';
import {
  expectTopologyDrawerLabeledField,
  expectVisibleTopologyDrawerContains,
} from '../topology/drawer';
import {
  pollTopologyDrawerLabeledFieldUntil,
  waitForPlacementDecisionClusterCount,
} from '../topology/drawer-poll';

type MergedTopologyBlock = { blockIndex: number; clusterName?: string; clusterResourceRows: TopologyClusterResourceRef[] };

function resolveGraphBlocksFromMerge(
  merged: MergedTopologyBlock[],
  topologyMergeBlockIndices?: number[]
): MergedTopologyBlock[] {
  if (!topologyMergeBlockIndices?.length) {
    return merged;
  }
  const out: MergedTopologyBlock[] = [];
  for (const blockIndex of [...new Set(topologyMergeBlockIndices)]) {
    const row = merged.find((b) => b.blockIndex === blockIndex);
    if (!row) {
      throw new Error(
        `verifySubscriptionAppTopologyTab: topologyMergeBlockIndices includes blockIndex ${blockIndex} but mergedSubscriptionBlocks has: ${merged.map((b) => b.blockIndex).join(', ')}`
      );
    }
    out.push(row);
  }
  return out;
}

export type TopologyDrawerSpotCheck = {
  /** `g[data-kind=node][data-id=…]` value to click. */
  nodeDataId: string;
  /** Substring or regex matched against the **visible** topology drawer panel text. */
  drawerContains: string | RegExp;
};

export type TopologySubscriptionScopeParam =
  | 'all'
  | 'initial' // multi-sub: leave `#comboChannel` on first subscription
  | { subscriptionCrName: string };

export type VerifySubscriptionAppTopologyTabParams = {
  page: Page;
  detailsPage: ApplicationDetailsPage;
  applicationName: string;
  namespace: string;
  clusterName?: string;
  blockIndex?: number;
  clusterResourceRows?: TopologyClusterResourceRef[];
  mergedSubscriptionBlocks?: { blockIndex: number; clusterName?: string; clusterResourceRows: TopologyClusterResourceRef[] }[];
  /** 1-based block indices for multi-sub graph scope. */
  topologyMergeBlockIndices?: number[];
  subscriptionScope?: TopologySubscriptionScopeParam;
  nodeHydrationTimeout?: number;
  drawerSpotChecks?: TopologyDrawerSpotCheck[];
  /** RHACM4K-41356: assert each graph node has `pf-m-success` after hydration. */
  assertGraphNodesSuccessStatus?: boolean;
  /** Timeout for {@link verifyTopologyGraphNodesSuccessStatus} (defaults to `nodeHydrationTimeout`). */
  graphNodesSuccessTimeout?: number;
  /** Active placement name when edit creates non-default CR (e.g. RHACM4K-49630 `placement-3`). */
  placementCrName?: string;
  subscriptionCrName?: string;
};

/** Asserts Topology URL, graph nodes, optional `#comboChannel`, and drawer spot checks. */
export async function verifySubscriptionAppTopologyTab(
  params: VerifySubscriptionAppTopologyTabParams
): Promise<void> {
  const {
    page,
    detailsPage,
    applicationName,
    namespace,
    clusterName,
    nodeHydrationTimeout = 120_000,
    drawerSpotChecks: drawerSpotChecksParam,
    subscriptionScope,
    assertGraphNodesSuccessStatus,
    graphNodesSuccessTimeout,
    placementCrName,
    subscriptionCrName,
  } = params;

  const merged = params.mergedSubscriptionBlocks;
  const topologyMergeBlockIndices = params.topologyMergeBlockIndices;
  let topologyDataIds: string[];
  let drawerSpotChecks: TopologyDrawerSpotCheck[];

  if (merged && merged.length > 0) {
    const graphBlocks = resolveGraphBlocksFromMerge(merged, topologyMergeBlockIndices);
    if (graphBlocks.length === 1) {
      const only = graphBlocks[0]!;
      const blockCluster = only.clusterName ?? clusterName;
      topologyDataIds = buildTopologyNodeDataIdsForSubscriptionBlock({
        applicationName,
        namespace,
        clusterName: blockCluster,
        blockIndex: only.blockIndex,
        clusterResourceRows: only.clusterResourceRows,
        placementCrName,
        subscriptionCrName,
      });
      drawerSpotChecks =
        drawerSpotChecksParam ??
        buildTopologyDrawerSpotChecksForSubscriptionBlock({
          applicationName,
          namespace,
          clusterName: blockCluster,
          blockIndex: only.blockIndex,
          clusterResourceRows: only.clusterResourceRows,
        });
    } else {
      topologyDataIds = buildMergedTopologyNodeDataIdsForSubscriptionBlocks({
        applicationName,
        namespace,
        blocks: graphBlocks,
      });
      drawerSpotChecks =
        drawerSpotChecksParam ??
        buildMergedTopologyDrawerSpotChecksForSubscriptionBlocks({
          applicationName,
          namespace,
          blocks: graphBlocks,
        });
    }
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
      clusterName,
      blockIndex,
      clusterResourceRows,
      placementCrName,
      subscriptionCrName,
    });
    drawerSpotChecks =
      drawerSpotChecksParam ??
      buildTopologyDrawerSpotChecksForSubscriptionBlock({
        applicationName,
        namespace,
        clusterName,
        blockIndex,
        clusterResourceRows,
        placementCrName,
        subscriptionCrName,
      });
  }

  await expectOpenShiftShellTitle(page);
  await expectApplicationTopologyUrl(page, namespace, applicationName);
  await expect(detailsPage.getApplicationHeading()).toHaveText(applicationName);
  await expect(detailsPage.getTopologyZoomInButton()).toBeVisible();

  const mergedBlockCount = merged?.length ?? 0;
  const hasComboChannel = mergedBlockCount > 1;

  if (hasComboChannel) {
    await expect(detailsPage.getTopologySubscriptionScopeToggle()).toBeVisible();
    const scope = subscriptionScope ?? 'initial';
    if (scope === 'all') {
      await detailsPage.chooseTopologySubscriptionScopeAll();
    } else if (scope === 'initial') {
      // Hub default: first subscription selected; do not open #comboChannel.
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

  if (assertGraphNodesSuccessStatus) {
    await verifyTopologyGraphNodesSuccessStatus(detailsPage, topologyDataIds, {
      timeout: graphNodesSuccessTimeout ?? nodeHydrationTimeout,
    });
  }
}

/**
 * RHACM4K-41356: each topology graph node reports success (`pf-m-success` on inner `.pf-topology__node`).
 * PF6 does not reliably expose `<use href="#nodeIcon_*">` (zoom / icon id drift).
 */
export async function verifyTopologyGraphNodesSuccessStatus(
  detailsPage: ApplicationDetailsPage,
  nodeDataIds: string[],
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 120_000;
  const successModifier = APP_APPLICATION_TOPOLOGY.topologyNodeSuccessModifier;

  await expect(detailsPage.getTopologySurface()).toBeVisible({ timeout: 60_000 });

  for (const dataId of nodeDataIds) {
    const node = detailsPage.getTopologyGraphNodeByDataId(dataId);
    const successNode = node.locator(`.pf-topology__node.${successModifier}`);
    await expect
      .poll(async () => (await successNode.count()) > 0, {
        timeout,
        intervals: [2_000, 5_000, 10_000],
      })
      .toBe(true);
    await expect(successNode).toBeVisible({ timeout: 10_000 });
  }
}

export type VerifyPlacementDecisionTopologyDrawerParams = {
  page: Page;
  detailsPage: ApplicationDetailsPage;
  applicationName: string;
  namespace: string;
  /** 1-based subscription / placement block (default `1`). */
  blockIndex?: number;
  expectation: PlacementDecisionDrawerExpectation;
  oc?: OcCliService;
  nodeHydrationTimeout?: number;
  drawerTimeout?: number;
};

/**
 * Asserts **PlacementDecision** topology drawer fields.
 * Caller should navigate to **Topology** first, or pass a page already on the topology tab.
 */
export async function verifyPlacementDecisionTopologyDrawer(
  params: VerifyPlacementDecisionTopologyDrawerParams
): Promise<void> {
  const {
    page,
    detailsPage,
    applicationName,
    namespace,
    blockIndex = 1,
    expectation,
    oc,
    nodeHydrationTimeout = 120_000,
    drawerTimeout = 90_000,
  } = params;

  const placementCrName = oc
    ? await resolvePlacementCrNameForSubscriptionBlock(oc, namespace, applicationName, blockIndex)
    : defaultPlacementCrName(applicationName, blockIndex);
  const nodeDataId = buildPlacementDecisionNodeDataId({
    applicationName,
    namespace,
    blockIndex,
    placementCrName,
  });
  const drawerLabels = APP_APPLICATION_TOPOLOGY.placementDrawer;

  await expectApplicationTopologyUrl(page, namespace, applicationName);
  await detailsPage.expectTopologyGraphContainsNodeDataIds([nodeDataId], {
    timeout: nodeHydrationTimeout,
  });

  // PlacementDecision drawer is a snapshot — wait for backend, then re-click until UI matches.
  if (oc) {
    await waitForPlacementDecisionClusterCount({
      oc,
      namespace,
      placementCrName,
      expectedCount: expectation.matchedClusterCount,
      timeout: drawerTimeout,
    });
  }

  const matchedClustersLabel = new RegExp(drawerLabels.matchedClusters);
  const expectedCount = String(expectation.matchedClusterCount);

  await pollTopologyDrawerLabeledFieldUntil({
    page,
    detailsPage,
    nodeDataId,
    fieldLabel: matchedClustersLabel,
    expected: expectedCount,
    timeout: drawerTimeout,
    message: `PlacementDecision drawer Matched Clusters should be ${expectedCount}`,
  });

  if (expectation.clusterSet) {
    try {
      await expectTopologyDrawerLabeledField(
        page,
        new RegExp(drawerLabels.clusterSet),
        expectation.clusterSet,
        { timeout: 15_000 }
      );
    } catch {
      if (!oc) throw new Error('clusterSet UI assertion failed and no `oc` was provided for fallback');
      const sets = await oc.getPlacementClusterSets(namespace, placementCrName);
      expect(sets).toContain(expectation.clusterSet);
    }
  }

  if (expectation.labelSelector) {
    const { key, values } = expectation.labelSelector;
    let uiOk = true;
    for (const value of values) {
      try {
        await expectVisibleTopologyDrawerContains(page, value, { timeout: 8_000 });
      } catch {
        uiOk = false;
        break;
      }
    }
    if (!uiOk) {
      if (!oc) {
        throw new Error('labelSelector UI assertion failed and no `oc` was provided for fallback');
      }
      const actual = await oc.getPlacementLabelSelectorValues(namespace, placementCrName, key);
      // Subset match on label values, not exact list equality.
      expect(actual).toEqual(expect.arrayContaining(values));
    } else {
      await expectTopologyDrawerLabeledField(page, new RegExp(drawerLabels.labelSelector), key, {
        timeout: 15_000,
      });
    }
  }
}

/** RHACM4K-10668: deployable icon shape + grouped node label. */
export type TopologyDeployableAssertion = {
  iconShapes: string[];
  label: RegExp;
};

/**
 * Deployable type in topology: `<use href="#nodeIcon_${shape}">` and/or grouped node title (multi-cluster graphs).
 */
export async function expectTopologyShowsDeployableTypes(
  surface: Locator,
  deployables: TopologyDeployableAssertion[],
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 180_000;
  for (const { iconShapes, label } of deployables) {
    const useSelector = iconShapes.map((s) => `[href="#nodeIcon_${s}"]`).join(', ');
    await expect
      .poll(
        async () => {
          if ((await surface.locator(useSelector).count()) > 0) {
            return 'use';
          }
          if ((await surface.getByText(label).count()) > 0) {
            return 'label';
          }
          return '';
        },
        { timeout, intervals: [2_000, 5_000, 10_000] }
      )
      .not.toBe('');
  }
}

/** RHACM4K-10668: Secret + CRD deployables (`other` icon → CRD). */
const GIT_CRD_TOPOLOGY_DEPLOYABLES: TopologyDeployableAssertion[] = [
  { iconShapes: ['secret'], label: /^Secret$/i },
  { iconShapes: ['other', 'customresource'], label: /customresourcedefinition/i },
];

export type VerifyCrdGitApplicationTopologyStatusParams = {
  detailsPage: ApplicationDetailsPage;
  applicationName: string;
  namespace: string;
};

/** RHACM4K-10668: graph nodes + Secret/CRD deployables (success count on Details). */
export async function verifyCrdGitApplicationTopologyStatus(
  params: VerifyCrdGitApplicationTopologyStatusParams
): Promise<void> {
  const { detailsPage, applicationName, namespace } = params;

  const surface = detailsPage.getTopologySurface();
  await expect(surface).toBeVisible({ timeout: 60_000 });

  const subscriptionCrName = defaultSubscriptionCrName(applicationName, 1);
  await detailsPage.expectTopologyGraphContainsNodeDataIds(
    [
      topologyApplicationDataId(applicationName),
      topologySubscriptionDataId(namespace, subscriptionCrName),
    ],
    { timeout: 120_000 }
  );

  await expectTopologyShowsDeployableTypes(surface, GIT_CRD_TOPOLOGY_DEPLOYABLES);
}
