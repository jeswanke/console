/**
 * End-to-end: drive subscription create wizard using e2e-spec-data `auto_git_multi` + createSubscription.
 * Scenario extends `subscription_submit` — wizard clicks **Create** and should leave the create URL on success.
 * Post-create: **Details** ({@link verifySubscriptionAppDetailsTab}), then **Topology**
 * ({@link verifySubscriptionAppTopologyTab}, **`subscriptionScope: 'all'`**, merged blocks).
 */
import path from 'path';
import {
  clearE2eSpecDataCache,
  getApplicationExpectationsPayload,
  getE2eScenario,
  getSubscriptionDomainPayload,
} from '@config';
import {
  verifySubscriptionAppDetailsTab,
} from '@lib/app/verify-subscription-details';
import { verifySubscriptionAppTopologyTab } from '@lib/app/verify-subscription-topology';
import { test, expect } from '@fixtures/app-test';
import { createSubscription } from '@lib/app/subscription-create';

const E2E_SPEC_DATA_DIR = path.join(process.cwd(), 'src/config/e2e-spec-data');

test.describe('Subscription create — auto_git_multi from e2e-spec-data', { tag: ['@alc', '@app'] }, () => {
  test.beforeEach(() => {
    clearE2eSpecDataCache();
  });

  test('createSubscription fills auto_git_multi YAML and submits', async ({
    page,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(180_000);
    const resolved = getE2eScenario('auto_git_multi', E2E_SPEC_DATA_DIR);
    const options = getSubscriptionDomainPayload(resolved);
    const expectations = getApplicationExpectationsPayload(resolved);
    expect(options.submit).toBe(true);

    await subscriptionApplicationCreateWizardPage.openFromApplicationsList(applicationListPage);
    await createSubscription(subscriptionApplicationCreateWizardPage, options);

    const { applicationName, namespace } = options;
    const mergedSubscriptionBlocks = [
      { blockIndex: 1, clusterResourceRows: expectations.topologyClusterResourceBlocks[0]! },
      { blockIndex: 2, clusterResourceRows: expectations.topologyClusterResourceBlocks[1]! },
    ];

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
      subscriptionScope: 'all',
      mergedSubscriptionBlocks,
    });
  });
});
