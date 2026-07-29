/**
 * Cypress `validateApplication` parity for Git subscription ALC apps (e.g. RHACM4K-20541).
 *
 * Order mirrors `application.js`: advanced tables → overview table → topology (+ details/sync) →
 * defect 7696 → hub `apiResources` → time window.
 */
import { expect, type Page } from '@playwright/test';

import { APP_SUBSCRIPTION_CREATE_WIZARD } from '@constants/app';
import type { ApplicationExpectationsPayload } from '@config/e2e-spec-loader/domains/application-expectations/applicationExpectationsSchema';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';

import { expectOcGetListContains } from '../../assertions/oc-resource-list';
import type { CreateSubscriptionOptions } from '../subscription/types';
import {
  defaultPlacementCrName,
  defaultSubscriptionCrName,
  expectTopologySubscriptionHookNodes,
  topologyApplicationDataId,
  topologySubscriptionDataId,
} from '../topology/graph-ids';
import {
  expectApplicationDetailsMinSuccessResourceCount,
  verifySubscriptionAppDetailsTab,
} from './details-tab';
import {
  expectTopologyShowsDeployableTypes,
  type TopologyDeployableAssertion,
  verifySubscriptionAppTopologyTab,
} from './topology-tab';

export type ValidateSubscriptionGitApplicationParams = {
  page: Page;
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  subscription: CreateSubscriptionOptions;
  applicationExpectations: ApplicationExpectationsPayload;
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

/** Cypress `channels` + `subscription` (+ `placement` when not local). */
export async function expectGitSubscriptionApiResourcesContain(
  oc: OcCliService,
  applicationName: string,
  namespace: string,
  options?: { localClusterPlacement?: boolean; timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 180_000;
  const pollOpts = { timeout };
  const subscriptionCrName = defaultSubscriptionCrName(applicationName, 1);

  await expectOcGetListContains(oc, {
    resource: 'applications.app',
    namespace,
    expectedSubstring: applicationName,
    ...pollOpts,
  });
  await expectOcGetListContains(oc, {
    resource: 'subscription',
    namespace,
    expectedSubstring: subscriptionCrName,
    ...pollOpts,
  });

  const channelRef = await oc.getSubscriptionChannelRef(namespace, subscriptionCrName);
  if (channelRef) {
    await expectOcGetListContains(oc, {
      resource: 'channel',
      namespace: channelRef.namespace,
      expectedSubstring: channelRef.name,
      ...pollOpts,
    });
  }

  if (!options?.localClusterPlacement) {
    await expectOcGetListContains(oc, {
      resource: 'placement',
      namespace,
      expectedSubstring: defaultPlacementCrName(applicationName, 1),
      ...pollOpts,
    });
  }
}

/** Cypress `apiResources(..., 'not.contain')` after delete. */
export async function expectGitSubscriptionApiResourcesAbsent(
  oc: OcCliService,
  applicationName: string,
  namespace: string
): Promise<void> {
  const subscriptionCrName = defaultSubscriptionCrName(applicationName, 1);
  const appList = await oc.getNamespacedResourceList('applications.app', namespace).catch(() => '');
  expect(appList.includes(applicationName)).toBe(false);

  const subList = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
  expect(subList.includes(subscriptionCrName)).toBe(false);
}

/** Cypress `validateTimewindow` for default (no schedule) subscriptions. */
export async function expectSubscriptionDefaultTimeWindow(
  oc: OcCliService,
  applicationName: string,
  namespace: string,
  blockIndex = 1
): Promise<void> {
  const subscriptionCrName = defaultSubscriptionCrName(applicationName, blockIndex);
  const yaml = await oc.getSubscriptionYaml(namespace, subscriptionCrName);
  expect(yaml).not.toContain('timewindow');
}

/** Hub subscription list contains app name substring (Cypress `oc get subscription -n …`). */
export async function hubSubscriptionListIncludesAppName(
  oc: OcCliService,
  namespace: string,
  applicationName: string
): Promise<boolean> {
  try {
    const stdout = await oc.getNamespacedResourceList('subscription', namespace);
    return stdout.includes(applicationName);
  } catch {
    return false;
  }
}

/** Cypress `validateDefect7696` — edit YAML round-trip; topology deployables still visible. */
export async function verifyGitApplicationDefect7696(
  page: Page,
  applicationDetailsPage: ApplicationDetailsPage,
  applicationName: string,
  namespace: string,
  topologyDeployables: TopologyDeployableAssertion[]
): Promise<void> {
  await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
  await page.reload();
  await expect(applicationDetailsPage.getApplicationHeading()).toHaveText(applicationName, {
    timeout: 120_000,
  });

  await page.locator(`#${applicationName}-actions`).click();
  await page.getByRole('menuitem', { name: /^Edit application$/i }).click();
  await expect(page.locator('#edit-button-portal-id')).toBeVisible({ timeout: 20_000 });

  const yamlToggle = page.locator(`#${APP_SUBSCRIPTION_CREATE_WIZARD.yamlToggleId}`);
  await expect(yamlToggle).not.toBeChecked();
  await yamlToggle.click({ force: true });
  await expect(yamlToggle).toBeChecked();
  await expect(page.locator('.yamlEditorContainer')).toBeVisible({ timeout: 5_000 });

  await page.locator('button#cancel-button-portal-id').click();
  await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
  const surface = applicationDetailsPage.getTopologySurface();
  await expect(surface).toBeVisible({ timeout: 60_000 });
  await expectTopologyShowsDeployableTypes(surface, topologyDeployables, { timeout: 120_000 });
}

/**
 * Full post-create validation aligned with Cypress `validateApplication` for Git subscription apps.
 */
export async function validateSubscriptionGitApplication(
  params: ValidateSubscriptionGitApplicationParams
): Promise<void> {
  const {
    page,
    oc,
    applicationListPage,
    applicationDetailsPage,
    subscription,
    applicationExpectations,
  } = params;
  const { applicationName, namespace, repositories } = subscription;
  const successMin = applicationExpectations.successMinResourceCount ?? 2;
  const deployableTypes = applicationExpectations.topologyDeployableResourceTypes ?? [];
  const localPlacement = applicationExpectations.localClusterPlacement ?? false;
  const topologyDeployables = buildTopologyDeployableAssertions(deployableTypes);
  const clusterResourceRows = applicationExpectations.topologyClusterResourceBlocks[0] ?? [];

  await applicationListPage.expectAdvancedConfigShowsSubscriptionAndChannelForBlock({
    applicationName,
    applicationExpectations,
    blockIndex: 1,
  });

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  const table = applicationListPage.applicationsTable;
  await table.search(applicationName);
  await applicationListPage.waitForLoad();
  const row = table.getRowByName(applicationName);
  await expect(row).toBeVisible({ timeout: 60_000 });
  await expect(table.getCellByLabel(row, 'name')).toContainText(applicationName);
  await expect(table.getCellByLabel(row, 'namespace')).toContainText(namespace);
  await expect(table.getCellByLabel(row, 'clusters')).toContainText('Local');

  await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
  const subscriptionCrName = defaultSubscriptionCrName(applicationName, 1);
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

  const hookSubstrings = applicationExpectations.topologySubscriptionHooks;
  if (hookSubstrings && hookSubstrings.length > 0) {
    await expectTopologySubscriptionHookNodes(
      applicationDetailsPage.getTopologySurface(),
      hookSubstrings,
      { timeout: 300_000 }
    );
  }

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

  const searchLink = page.locator(`a[href*="${applicationName}"]`).first();
  await expect(searchLink).toBeVisible({ timeout: 50_000 });
  await expect(searchLink).toHaveAttribute('href', new RegExp(applicationName));
  await expect(searchLink).toHaveAttribute('href', new RegExp(namespace));

  await expectApplicationDetailsMinSuccessResourceCount(applicationDetailsPage, successMin, {
    timeout: 300_000,
  });

  await applicationDetailsPage.syncApplication({ timeout: 60_000 });

  await expect(applicationDetailsPage.getDescriptionValue('clusters')).toContainText('Local', {
    timeout: 120_000,
  });

  await verifyGitApplicationDefect7696(
    page,
    applicationDetailsPage,
    applicationName,
    namespace,
    topologyDeployables.length > 0
      ? topologyDeployables
      : [{ iconShapes: ['pod'], label: /^Pod$/i }]
  );

  await expectGitSubscriptionApiResourcesContain(oc, applicationName, namespace, {
    localClusterPlacement: localPlacement,
    timeout: 180_000,
  });

  await expectSubscriptionDefaultTimeWindow(oc, applicationName, namespace);

  await applicationDetailsPage.expectTopologyGraphContainsNodeDataIds(
    [topologyApplicationDataId(applicationName), topologySubscriptionDataId(namespace, subscriptionCrName)],
    { timeout: 60_000 }
  );
}
