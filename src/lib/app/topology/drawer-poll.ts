/**
 * Poll topology drawer fields after re-opening a graph node (drawer content is a snapshot).
 */
import { expect, type Page } from '@playwright/test';

import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { OcCliService } from '@services/OcCliService';

import { readTopologyDrawerLabeledField } from './drawer';

/** Shared intervals for placement / topology drawer polls. */
export const TOPOLOGY_DRAWER_POLL_INTERVALS: number[] = [2_000, 3_000, 5_000];

export type PollTopologyDrawerLabeledFieldParams = {
  page: Page;
  detailsPage: ApplicationDetailsPage;
  /** `g[data-kind=node][data-id=…]` — re-clicked each poll iteration. */
  nodeDataId: string;
  fieldLabel: string | RegExp;
  /** Substring or regex matched against the drawer field value. */
  expected: string | RegExp;
  timeout?: number;
  message?: string;
};

/**
 * Re-clicks `nodeDataId` and polls until a labeled drawer field matches `expected`
 * (PlacementDecision **Matched Clusters** and similar snapshot panels).
 */
export async function pollTopologyDrawerLabeledFieldUntil(
  params: PollTopologyDrawerLabeledFieldParams
): Promise<void> {
  const {
    page,
    detailsPage,
    nodeDataId,
    fieldLabel,
    expected,
    timeout = 90_000,
    message = `Topology drawer field ${String(fieldLabel)} should match ${String(expected)}`,
  } = params;

  await expect
    .poll(
      async () => {
        await detailsPage.clickTopologyGraphNodeByDataId(nodeDataId);
        const value = await readTopologyDrawerLabeledField(page, fieldLabel);
        if (value === undefined) return false;
        return typeof expected === 'string' ? value.includes(expected) : expected.test(value);
      },
      {
        timeout,
        intervals: TOPOLOGY_DRAWER_POLL_INTERVALS,
        message,
      }
    )
    .toBe(true);
}

export type WaitForPlacementDecisionClusterCountParams = {
  oc: OcCliService;
  namespace: string;
  placementCrName: string;
  expectedCount: number;
  timeout?: number;
};

/** Polls `oc` until **PlacementDecision** status reports the expected matched cluster count. */
export async function waitForPlacementDecisionClusterCount(
  params: WaitForPlacementDecisionClusterCountParams
): Promise<void> {
  const { oc, namespace, placementCrName, expectedCount, timeout = 90_000 } = params;
  await expect
    .poll(() => oc.getPlacementDecisionClusterCount(namespace, placementCrName), {
      timeout,
      intervals: TOPOLOGY_DRAWER_POLL_INTERVALS,
      message: `PlacementDecision ${placementCrName} matched cluster count before opening drawer`,
    })
    .toBe(expectedCount);
}
