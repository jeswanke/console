/**
 * **Topology** tab verification for a subscription application: graph `data-id`s, scope menu, drawer checks.
 * Composes {@link topology/graph-ids} builders with {@link ApplicationDetailsPage}.
 * Multi-subscription: pass {@link VerifySubscriptionAppTopologyTabParams.mergedSubscriptionBlocks} (≥2 blocks),
 * {@link VerifySubscriptionAppTopologyTabParams.subscriptionScope} (`initial` / `all` / CR name), and optional
 * {@link VerifySubscriptionAppTopologyTabParams.topologyMergeBlockIndices} to assert a single subscription’s graph.
 *
 * @see {@link verifySubscriptionAppDetailsTab} — callers navigate to **Topology** before this helper.
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

type MergedTopologyBlock = { blockIndex: number; clusterResourceRows: TopologyClusterResourceRef[] };

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
  /**
   * Multi-subscription only: leave **`#comboChannel`** on the hub default (first subscription). Use for the first
   * Topology pass after Create when the graph should match subscription block 1 only.
   */
  | 'initial'
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
   * Multi-repo / multi-subscription: defines every subscription block (enables **`#comboChannel`** when length ≥ 2).
   * Graph node ids / drawers use {@link topologyMergeBlockIndices} when set, otherwise all blocks merged.
   */
  mergedSubscriptionBlocks?: { blockIndex: number; clusterResourceRows: TopologyClusterResourceRef[] }[];
  /**
   * With {@link mergedSubscriptionBlocks}, restrict expected graph **`data-id`**s to these **1-based** block indices
   * (e.g. `[1]` = first subscription only, `[2]` = second, omit = merged graph for every block).
   */
  topologyMergeBlockIndices?: number[];
  /**
   * Topology **`#comboChannel`** PF6 MenuToggle — only when **more than one** subscription exists.
   * **`'initial'`** (default when omitted): do not open the menu — first subscription stays selected.
   * **`'all'`** or **`{ subscriptionCrName }`**: apply that scope before polling the graph.
   */
  subscriptionScope?: TopologySubscriptionScopeParam;
  /** Poll until all graph node `data-id`s exist (default 120s). */
  nodeHydrationTimeout?: number;
  /** Optional: click nodes and assert side-panel content (defaults to full block / merged builder when omitted). */
  drawerSpotChecks?: TopologyDrawerSpotCheck[];
};

/**
 * Asserts URL / title / graph chrome (caller must already be on **Topology**, e.g. after
 * {@link ApplicationDetailsPage.navigateToApplicationTab}), **`#comboChannel`** only when multi-repo merged blocks,
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
  const topologyMergeBlockIndices = params.topologyMergeBlockIndices;
  let topologyDataIds: string[];
  let drawerSpotChecks: TopologyDrawerSpotCheck[];

  if (merged && merged.length > 0) {
    const graphBlocks = resolveGraphBlocksFromMerge(merged, topologyMergeBlockIndices);
    if (graphBlocks.length === 1) {
      const only = graphBlocks[0]!;
      topologyDataIds = buildTopologyNodeDataIdsForSubscriptionBlock({
        applicationName,
        namespace,
        blockIndex: only.blockIndex,
        clusterResourceRows: only.clusterResourceRows,
      });
      drawerSpotChecks =
        drawerSpotChecksParam ??
        buildTopologyDrawerSpotChecksForSubscriptionBlock({
          applicationName,
          namespace,
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
 * Asserts **PlacementDecision** topology drawer fields (Cypress `validatePlacementTopology`).
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
      // Cypress `.should('contain', value)` — subset match, not exact label list.
      expect(actual).toEqual(expect.arrayContaining(values));
    } else {
      await expectTopologyDrawerLabeledField(page, new RegExp(drawerLabels.labelSelector), key, {
        timeout: 15_000,
      });
    }
  }
}

/** RHACM4K-10668 / Cypress `validateDeployables`: icon shape + grouped node label. */
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

/** Cypress `resources: ["secret","other"]` for RHACM4K-10668 (`other` → CRD icon). */
const GIT_CRD_TOPOLOGY_DEPLOYABLES: TopologyDeployableAssertion[] = [
  { iconShapes: ['secret'], label: /^Secret$/i },
  { iconShapes: ['other', 'customresource'], label: /customresourcedefinition/i },
];

export type VerifyCrdGitApplicationTopologyStatusParams = {
  detailsPage: ApplicationDetailsPage;
  applicationName: string;
  namespace: string;
};

/**
 * RHACM4K-10668: app/subscription graph nodes + Secret/CRD deployables on **Topology**.
 * Success counts: {@link expectApplicationDetailsMinSuccessResourceCount} on **Details**.
 */
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
