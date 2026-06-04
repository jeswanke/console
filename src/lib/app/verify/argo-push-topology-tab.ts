/** ApplicationSet push-model Topology tab — graph node `data-id` values from deployed resources. */

import { expect, type Page } from '@playwright/test';

import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import {
  expectApplicationTopologyUrl,
  expectOpenShiftShellTitle,
  type TopologyClusterResourceRef,
} from '../topology/graph-ids';
import { buildTopologyNodeDataIdsForAppSetPush } from '../topology/appset-graph-ids';

export type VerifyArgoPushAppTopologyTabParams = {
  page: Page;
  detailsPage: ApplicationDetailsPage;
  applicationSetName: string;
  argoServerNamespace: string;
  destinationNamespace: string;
  clusterResourceRows: TopologyClusterResourceRef[];
  clusterName?: string;
  nodeHydrationTimeout?: number;
};

/** Asserts Topology URL, toolbar chrome, and every expected graph node `data-id`. */
export async function verifyArgoPushAppTopologyTab(
  params: VerifyArgoPushAppTopologyTabParams
): Promise<void> {
  const {
    page,
    detailsPage,
    applicationSetName,
    argoServerNamespace,
    destinationNamespace,
    clusterResourceRows,
    clusterName,
    nodeHydrationTimeout = 300_000,
  } = params;

  const topologyDataIds = buildTopologyNodeDataIdsForAppSetPush({
    applicationSetName,
    argoServerNamespace,
    destinationNamespace,
    clusterName,
    clusterResourceRows,
  });

  await expectOpenShiftShellTitle(page);
  await expectApplicationTopologyUrl(page, argoServerNamespace, applicationSetName);
  await expect(detailsPage.getApplicationHeading()).toHaveText(applicationSetName);
  await expect(detailsPage.getTopologyZoomInButton()).toBeVisible();

  await detailsPage.expectTopologyGraphContainsNodeDataIds(topologyDataIds, {
    timeout: nodeHydrationTimeout,
  });
}
