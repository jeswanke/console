/**
 * Cypress `verifyApplicationStatus` / `verifyApplicationBackend` for namespace name length ALC tests.
 */
import { expect } from '@playwright/test';

import type { ApplicationExpectationsPayload } from '@config/e2e-spec-loader/domains/application-expectations/applicationExpectationsSchema';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';

import { defaultPlacementCrName, defaultSubscriptionCrName } from '../topology/graph-ids';
import { expectApplicationDetailsMinSuccessResourceCount } from './details-tab';
import { expectSubscriptionAppResourcesViaOc } from './resources-oc';

/** Clone subscription scenario with a different hub application name / namespace. */
export function withSubscriptionIdentity(
  base: CreateSubscriptionOptions,
  applicationName: string,
  namespace: string
): CreateSubscriptionOptions {
  return { ...base, applicationName, namespace };
}

/** Cypress `verifyApplicationStatus` — row visible + Details green success count. */
export async function verifyNamespaceLengthApplicationStatusInUi(params: {
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  applicationName: string;
  namespace: string;
  minSuccessCount?: number;
}): Promise<void> {
  const {
    applicationListPage,
    applicationDetailsPage,
    applicationName,
    namespace,
    minSuccessCount = 1,
  } = params;

  await applicationListPage.goto();
  await applicationListPage.waitForLoad();
  const table = applicationListPage.applicationsTable;
  await table.search(applicationName);
  await expect(table.getRowByName(applicationName)).toBeVisible({ timeout: 120_000 });

  await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
  await expect(applicationDetailsPage.getApplicationHeading()).toHaveText(applicationName, {
    timeout: 120_000,
  });
  await expectApplicationDetailsMinSuccessResourceCount(applicationDetailsPage, minSuccessCount, {
    timeout: 300_000,
  });
}

/** Poll hub Subscription + Placement CRs (Cypress `oc get subscription/placement` waits). */
export async function expectHubSubscriptionAndPlacementReady(
  oc: OcCliService,
  applicationName: string,
  namespace: string
): Promise<void> {
  const subscriptionCrName = defaultSubscriptionCrName(applicationName, 1);
  const placementCrName = defaultPlacementCrName(applicationName, 1);
  const pollOpts = { timeout: 300_000, intervals: [5_000, 10_000] };

  await expect
    .poll(async () => {
      const subs = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
      return subs.includes(subscriptionCrName);
    }, pollOpts)
    .toBe(true);

  await expect
    .poll(async () => {
      const placements = await oc.getNamespacedResourceList('placement', namespace).catch(() => '');
      return placements.includes(placementCrName);
    }, pollOpts)
    .toBe(true);
}

/** Verify example-k8s-app resources deployed in the subscription's namespace. */
export async function verifyExampleK8sAppBackendOnLocalCluster(
  oc: OcCliService,
  applicationExpectations: ApplicationExpectationsPayload,
  namespace: string
): Promise<void> {
  await expectSubscriptionAppResourcesViaOc({
    oc,
    applicationName: 'namespace-length-backend',
    namespace,
    applicationExpectations,
    includeApplication: false,
    includeSubscriptionAndPlacement: false,
    blockIndices: [1],
    timeout: 1_200_000,
  });
}
