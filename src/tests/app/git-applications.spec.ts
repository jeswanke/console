/**
 * Git **Application** flows (ALC): create from e2e-spec-data, then **Details** + **Topology**, list search, and
 * **Advanced configuration** (Subscription ↔ Channel columns).
 * @see {@link verifySubscriptionAppDetailsTab}, {@link verifySubscriptionAppTopologyTab}
 */
import path from 'path';
import {
  clearE2eSpecDataCache,
  getApplicationExpectationsPayload,
  getSubscriptionDomainPayload,
  getTestDataForE2e,
} from '@config';
import { createSubscription } from '@lib/app/subscription-create';
import { verifySubscriptionAppDetailsTab } from '@lib/app/verify-subscription-details';
import { verifySubscriptionAppTopologyTab } from '@lib/app/verify-subscription-topology';
import { test, expect } from '@fixtures/app-test';

const E2E_SPEC_DATA_DIR = path.join(process.cwd(), 'src/config/e2e-spec-data');

test.describe('Git Applications', { tag: ['@alc', '@app'] }, () => {
  test.beforeEach(() => {
    clearE2eSpecDataCache();
  });

  test('RHACM4K-7484: ALC: Create a Git Application deployed on a Local Cluster', async ({
    page,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(180_000);
    const matched = getTestDataForE2e('RHACM4K-7484', E2E_SPEC_DATA_DIR);
    expect(matched, 'e2e-spec-data: testcase RHACM4K-7484').toHaveLength(1);
    const resolved = matched[0]!;
    const options = getSubscriptionDomainPayload(resolved);
    const expectations = getApplicationExpectationsPayload(resolved);

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

    const { applicationName, namespace } = options;
    const clusterResourceRows = expectations.topologyClusterResourceBlocks[0]!;

    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      applicationExpectations: expectations,
      repositories: options.repositories,
    });

    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      blockIndex: 1,
      clusterResourceRows,
    });

    // List toolbar: search by name, Type filter, clear search — parity with Cypress `searchApplication` (CLC).
    await applicationListPage.expectApplicationDiscoverableViaSearchAndTypeFilter(applicationName);

    await applicationListPage.expectAdvancedConfigShowsSubscriptionAndChannelForBlock({
      applicationName,
      applicationExpectations: expectations,
      blockIndex: 1,
    });
  });
});
