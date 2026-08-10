/**
 * Cypress `validateApplication` parity for Helm subscription ALC apps on managed clusters.
 */
import { expect, type Page } from '@playwright/test';

import type { ApplicationExpectationsPayload } from '@config/e2e-spec-loader/domains/application-expectations/applicationExpectationsSchema';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';

import type { CreateSubscriptionOptions } from '../subscription/types';
import {
  expectApplicationDetailsMinSuccessResourceCount,
  verifySubscriptionAppDetailsTab,
} from './details-tab';
import {
  expectTopologyShowsDeployableTypes,
  verifySubscriptionAppTopologyTab,
  type TopologyDeployableAssertion,
} from './topology-tab';
import {
  expectGitSubscriptionApiResourcesContain,
  expectSubscriptionDefaultTimeWindow,
} from './validate-subscription-git-application';
import { expectSubscriptionAppResourcesViaOc } from './resources-oc';

export type VerifySubscriptionHelmApplicationParams = {
  page: Page;
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  subscription: CreateSubscriptionOptions;
  applicationExpectations: ApplicationExpectationsPayload;
  managedClusterName: string;
};

function deployableIconShape(resourceType: string): string {
  if (resourceType === 'endpoints') return 'other';
  if (resourceType === 'helmrelease') return 'chart';
  return resourceType;
}

function buildTopologyDeployableAssertions(resourceTypes: string[]): TopologyDeployableAssertion[] {
  return resourceTypes.map((type) => ({
    iconShapes: [deployableIconShape(type)],
    label: new RegExp(type, 'i'),
  }));
}

/** Post-create UI + hub oc checks for a Helm subscription app on a managed cluster. */
export async function verifySubscriptionHelmApplication(
  params: VerifySubscriptionHelmApplicationParams
): Promise<void> {
  const {
    page,
    oc,
    applicationListPage,
    applicationDetailsPage,
    subscription,
    applicationExpectations,
    managedClusterName,
  } = params;
  const { applicationName, namespace, repositories } = subscription;
  const clusterResourceRows = applicationExpectations.topologyClusterResourceBlocks[0] ?? [];
  const deployableTypes = applicationExpectations.topologyDeployableResourceTypes ?? [];
  const topologyDeployables = buildTopologyDeployableAssertions(deployableTypes);
  const successMin = applicationExpectations.successMinResourceCount ?? 2;

  await expectSubscriptionAppResourcesViaOc({
    oc,
    applicationName,
    namespace,
    applicationExpectations,
  });

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  const table = applicationListPage.applicationsTable;
  await table.search(applicationName);
  const row = table.getRowByName(applicationName);
  await expect(row).toBeVisible({ timeout: 120_000 });
  await expect(table.getCellByLabel(row, 'namespace')).toContainText(namespace);
  await expect(table.getCellByLabel(row, 'clusters')).toContainText(managedClusterName);

  await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
  await verifySubscriptionAppDetailsTab({
    page,
    detailsPage: applicationDetailsPage,
    applicationName,
    namespace,
    applicationExpectations,
    repositories,
    detailsValuesTimeout: 300_000,
  });

  await expectApplicationDetailsMinSuccessResourceCount(applicationDetailsPage, successMin, {
    timeout: 300_000,
  });

  await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
  await verifySubscriptionAppTopologyTab({
    page,
    detailsPage: applicationDetailsPage,
    applicationName,
    namespace,
    blockIndex: 1,
    clusterResourceRows,
    assertGraphNodesSuccessStatus: false,
  });
  if (topologyDeployables.length > 0) {
    await expectTopologyShowsDeployableTypes(
      applicationDetailsPage.getTopologySurface(),
      topologyDeployables,
      { timeout: 300_000 }
    );
  }

  await applicationListPage.expectAdvancedConfigShowsSubscriptionAndChannelForBlock({
    applicationName,
    applicationExpectations,
    blockIndex: 1,
  });

  await expectGitSubscriptionApiResourcesContain(oc, applicationName, namespace, {
    localClusterPlacement: false,
    timeout: 180_000,
  });

  await expectSubscriptionDefaultTimeWindow(oc, applicationName, namespace);
}
