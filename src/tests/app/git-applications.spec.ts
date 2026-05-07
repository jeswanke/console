/**
 * Git **Application** flows (ALC): create from e2e-spec-data, then **Details** + **Topology**, list search, and
 * **Advanced configuration** (Subscription ↔ Channel columns). Includes single-repo (`auto_git_helloworld_local` via
 * Polarion ids), **add/delete-subscription** edit flows (`RHACM4K-7554`, `RHACM4K-7555`), and
 * **multi-subscription** (`auto_git_multi`: RHACM4K-7556 create, RHACM4K-7557 delete).
 * @see {@link verifySubscriptionAppDetailsTab}, {@link verifySubscriptionAppTopologyTab}
 */
import path from 'path';
import {
  clearE2eSpecDataCache,
  getE2eScenario,
  getApplicationExpectationsPayload,
  getSubscriptionDomainPayload,
  getTestDataForE2e,
} from '@config';
import {
  addSubscriptionToExistingApplication,
  createSubscription,
  deleteSubscriptionFromExistingApplication,
} from '@lib/app/subscription-create';
import { verifySubscriptionAppDetailsTab } from '@lib/app/verify-subscription-details';
import { verifySubscriptionAppTopologyTab } from '@lib/app/verify-subscription-topology';
import { expect, test } from '@fixtures/app-test';

const E2E_SPEC_DATA_DIR = path.join(process.cwd(), 'src/config/e2e-spec-data');

test.describe('Git Applications', { tag: ['@alc', '@app'] }, () => {
  test.describe.configure({ mode: 'serial' });

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

    // List toolbar: search by name, Type filter, then clear search.
    await applicationListPage.expectApplicationDiscoverableViaSearchAndTypeFilter(applicationName);

    await applicationListPage.expectAdvancedConfigShowsSubscriptionAndChannelForBlock({
      applicationName,
      applicationExpectations: expectations,
      blockIndex: 1,
    });
  });

  test('RHACM4K-7556: ALC: Create a Git Application with Multiple Subscriptions', async ({
    page,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(180_000);
    const matched = getTestDataForE2e('RHACM4K-7556', E2E_SPEC_DATA_DIR);
    const resolved = matched[0]!;
    const options = getSubscriptionDomainPayload(resolved);
    const expectations = getApplicationExpectationsPayload(resolved);
    expect(options.submit).toBe(true);
    expect(options.repositories).toHaveLength(2);

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

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

  test('RHACM4K-7554: ALC: Add A Git Subscription to An Existing Git Application', async ({
    page,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(240_000);
    const baseResolved = getE2eScenario('auto_git_add_subscription_base', E2E_SPEC_DATA_DIR);
    const baseOptions = getSubscriptionDomainPayload(baseResolved);
    const baseExpectations = getApplicationExpectationsPayload(baseResolved);

    const addMatched = getTestDataForE2e('RHACM4K-7554', E2E_SPEC_DATA_DIR);
    const addResolved = addMatched[0]!;
    const addOptions = getSubscriptionDomainPayload(addResolved);
    const addExpectations = getApplicationExpectationsPayload(addResolved);
    expect(addOptions.repositories).toHaveLength(1);

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, baseOptions);
    await addSubscriptionToExistingApplication(
      applicationListPage,
      subscriptionApplicationCreateWizardPage,
      addOptions
    );

    const applicationName = addOptions.applicationName;
    const namespace = addOptions.namespace;

    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      applicationExpectations: baseExpectations,
      repositories: [...baseOptions.repositories, ...addOptions.repositories],
    });

    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      subscriptionScope: 'all',
      mergedSubscriptionBlocks: [
        { blockIndex: 1, clusterResourceRows: baseExpectations.topologyClusterResourceBlocks[0]! },
        { blockIndex: 2, clusterResourceRows: addExpectations.topologyClusterResourceBlocks[0]! },
      ],
    });
  });

  test('RHACM4K-7555: ALC: Delete A Git Subscription from an Existing Multi-Subscription Git Application', async ({
    page,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(240_000);
    const matched = getTestDataForE2e('RHACM4K-7555', E2E_SPEC_DATA_DIR);
    const resolved = matched[0]!;
    const options = getSubscriptionDomainPayload(resolved);
    const expectations = getApplicationExpectationsPayload(resolved);
    expect(options.repositories).toHaveLength(2);

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);
    await deleteSubscriptionFromExistingApplication(
      applicationListPage,
      subscriptionApplicationCreateWizardPage,
      {
        applicationName: options.applicationName,
        namespace: options.namespace,
        deleteBlockIndex: 1,
      }
    );

    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: options.applicationName,
      namespace: options.namespace,
      applicationExpectations: expectations,
      repositories: [options.repositories[0]!],
    });

    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: options.applicationName,
      namespace: options.namespace,
      blockIndex: 1,
      clusterResourceRows: expectations.topologyClusterResourceBlocks[0]!,
    });
  });

  test('RHACM4K-7557: ALC: Delete a Git Application with Multiple Subscriptions', async ({
    applicationListPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(240_000);
    const matched = getTestDataForE2e('RHACM4K-7557', E2E_SPEC_DATA_DIR);
    const resolved = matched[0]!;
    const options = getSubscriptionDomainPayload(resolved);
    expect(options.repositories).toHaveLength(2);

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName: options.applicationName,
      namespace: options.namespace,
      removeRelatedResources: true,
    });
  });

  test('RHACM4K-7487: ALC: Delete a Git Application deployed on a Local Cluster', async ({
    applicationListPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(240_000);
    const matched = getTestDataForE2e('RHACM4K-7487', E2E_SPEC_DATA_DIR);
    const resolved = matched[0]!;
    const options = getSubscriptionDomainPayload(resolved);

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName: options.applicationName,
      namespace: options.namespace,
      removeRelatedResources: true,
    });
  });
});
