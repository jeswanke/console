/**
 * RHACM4K-7485, 7812–7815, 7561, 45792 — Object storage ALC suite.
 *
 * Cypress: `Object_Storage_Application_Test_Suite.cy.js`.
 * Scenario data: `object-applications.yaml` + `_shared.yaml` object storage fragments.
 */
import {
  clearE2eSpecDataCache,
  resolveSubscriptionScenarioByTestId,
} from '@config';
import {
  applyObjectStoreAuthToSubscriptionOptions,
  skipUnlessObjectStoreAuthConfigured,
} from '@lib/app/auth/object-store-auth';
import {
  addSubscriptionToExistingApplication,
  applyManagedClusterPlacementToBlocks,
  createSubscription,
  deleteSubscriptionFromExistingApplication,
} from '@lib/app/subscription';
import {
  deleteObjectMultiApplicationViaOc,
} from '@lib/app/setup/object-subscription-api';
import { skipUnlessPrimaryManagedCluster } from '@lib/cluster/managedClusterContext';
import {
  subscriptionDetailsClusterResourceTotalPattern,
  verifySubscriptionAppDetailsTab,
} from '@lib/app/verify/details-tab';
import { verifySubscriptionAppTopologyTab } from '@lib/app/verify/topology-tab';
import { verifySubscriptionObjectApplication } from '@lib/app/verify/validate-subscription-object-application';
import {
  expectGitSubscriptionApiResourcesAbsent,
  hubSubscriptionListIncludesAppName,
} from '@lib/app/verify/validate-subscription-git-application';
import { expect, test } from '@fixtures/app-test';

test.describe(
  'ALC: Object Storage Application Test Suite',
  { tag: ['@fresh-install', '@placement', '@obj-apps', '@alc', '@app'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-7485: ALC: Create an Object Storage Application Deployed on All Online Clusters and Local Cluster',
      {
        tag: [
          '@e2e-common', '@e2e',
          '@RHACM4K-7485',
          '@create',
          '@ocpInterop',
          '@post-release',
          '@pre-upgrade',
          '@post-upgrade',
        ],
      },
      async ({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const auth = skipUnlessObjectStoreAuthConfigured(test, 'RHACM4K-7485');
        if (!auth) return;

        const { subscription: baseOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-7485');
        const options = applyObjectStoreAuthToSubscriptionOptions(baseOptions, auth);
        const { applicationName, namespace } = options;

        if (!(await oc.applicationsAppK8sIoExists(namespace, applicationName))) {
          await applicationListPage.goto();
          await createSubscription(
            applicationListPage,
            subscriptionApplicationCreateWizardPage,
            options
          );
          await oc.labelNamespaceForAlcTest(namespace);
        }

        await verifySubscriptionObjectApplication({
          page,
          oc,
          applicationListPage,
          applicationDetailsPage,
          subscription: options,
          applicationExpectations: expectations,
          skipHubClusterResourcePoll: true,
        });
      }
    );

    test(
      'RHACM4K-7815: ALC: Delete an Object Storage Application Deployed on All Online Clusters and Local Cluster',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7815', '@destroy', '@ocpInterop'] },
      async ({ oc, applicationListPage }) => {
        test.setTimeout(300_000);
        const { subscription: options } = resolveSubscriptionScenarioByTestId('RHACM4K-7815');
        const { applicationName, namespace } = options;

        await applicationListPage.deleteApplicationFromOverviewViaSearch({
          applicationName,
          namespace,
          removeRelatedResources: true,
        });

        await expectGitSubscriptionApiResourcesAbsent(oc, applicationName, namespace);
      }
    );

    test(
      'RHACM4K-7814: ALC: Create an Object Storage Application with Multiple Subscriptions',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7814', '@create', '@ocpInterop'] },
      async ({
        page,
        oc,
        managedClusterContext,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const auth = skipUnlessObjectStoreAuthConfigured(test, 'RHACM4K-7814');
        if (!auth) return;
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-7814'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;

        const { subscription: baseOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-7814');
        const options = applyObjectStoreAuthToSubscriptionOptions(
          applyManagedClusterPlacementToBlocks(baseOptions, managedClusterName, 0),
          auth
        );
        expect(options.repositories).toHaveLength(2);

        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          options
        );
        await oc.labelNamespaceForAlcTest(options.namespace);

        const { applicationName, namespace } = options;
        const block1Clusters = await oc.getPlacementDecisionClusterNames(namespace, `${applicationName}-placement-1`);
        const block2Clusters = await oc.getPlacementDecisionClusterNames(namespace, `${applicationName}-placement-2`);
        const mergedSubscriptionBlocks = [
          { blockIndex: 1, clusterName: [...block1Clusters].sort().join('--') || 'local-cluster', clusterResourceRows: expectations.topologyClusterResourceBlocks[0]! },
          { blockIndex: 2, clusterName: [...block2Clusters].sort().join('--') || 'local-cluster', clusterResourceRows: expectations.topologyClusterResourceBlocks[1]! },
        ];

        await verifySubscriptionAppDetailsTab({
          page,
          detailsPage: applicationDetailsPage,
          applicationName,
          namespace,
          applicationExpectations: expectations,
          repositories: options.repositories,
          clusterResourceStatusPattern: subscriptionDetailsClusterResourceTotalPattern(
            expectations.successMinResourceCount ?? 5
          ),
          detailsValuesTimeout: 300_000,
        });

        await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
        await verifySubscriptionAppTopologyTab({
          page,
          detailsPage: applicationDetailsPage,
          applicationName,
          namespace,
          mergedSubscriptionBlocks,
          subscriptionScope: 'all',
        });
      }
    );

    test(
      'RHACM4K-7561: ALC: Delete An Object Storage Subscription from an Existing Multi-Subscription Object Storage Application',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7516', '@edit'] },
      async ({
        page,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(300_000);
        const { subscription: options, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-7561');
        expect(options.repositories).toHaveLength(2);

        await deleteSubscriptionFromExistingApplication(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          {
            applicationName: options.applicationName,
            namespace: options.namespace,
            entry: 'details',
            deleteBlockIndex: 0,
          }
        );

        await applicationDetailsPage.navigateToApplicationTab(
          options.namespace,
          options.applicationName,
          'details'
        );
        await verifySubscriptionAppDetailsTab({
          page,
          detailsPage: applicationDetailsPage,
          applicationName: options.applicationName,
          namespace: options.namespace,
          applicationExpectations: expectations,
          repositories: [options.repositories[1]!],
          detailsValuesTimeout: 120_000,
        });

        await applicationDetailsPage.navigateToApplicationTab(
          options.namespace,
          options.applicationName,
          'topology'
        );
        await verifySubscriptionAppTopologyTab({
          page,
          detailsPage: applicationDetailsPage,
          applicationName: options.applicationName,
          namespace: options.namespace,
          blockIndex: 2,
          clusterResourceRows: expectations.topologyClusterResourceBlocks[1]!,
        });
      }
    );

    test(
      'RHACM4K-7812: ALC: Add An Object Storage Subscription to An Existing Object Storage Application',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7812', '@edit'] },
      async ({
        page,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(300_000);
        const auth = skipUnlessObjectStoreAuthConfigured(test, 'RHACM4K-7812');
        if (!auth) return;

        const { subscription: addBaseOptions } = resolveSubscriptionScenarioByTestId('RHACM4K-7812');
        const { subscription: multiOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-7814');
        const addOptions = applyObjectStoreAuthToSubscriptionOptions(addBaseOptions, auth);
        expect(addOptions.repositories).toHaveLength(1);

        await addSubscriptionToExistingApplication(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          {
            ...addOptions,
            entry: 'details',
            perBlock: [
              {
                clusterDeployment: {
                  useExistingPlacementRule: true,
                  placementRuleComboText: `${multiOptions.applicationName}-placement-1`,
                },
              },
            ],
          }
        );

        await applicationDetailsPage.navigateToApplicationTab(
          addOptions.namespace,
          addOptions.applicationName,
          'details'
        );
        await verifySubscriptionAppDetailsTab({
          page,
          detailsPage: applicationDetailsPage,
          applicationName: addOptions.applicationName,
          namespace: addOptions.namespace,
          applicationExpectations: expectations,
          repositories: [multiOptions.repositories[1]!, addOptions.repositories[0]!],
          detailsValuesTimeout: 180_000,
        });

        await applicationDetailsPage.navigateToApplicationTab(
          addOptions.namespace,
          addOptions.applicationName,
          'topology'
        );
        await verifySubscriptionAppTopologyTab({
          page,
          detailsPage: applicationDetailsPage,
          applicationName: addOptions.applicationName,
          namespace: addOptions.namespace,
          subscriptionScope: 'all',
          mergedSubscriptionBlocks: [
            { blockIndex: 1, clusterResourceRows: expectations.topologyClusterResourceBlocks[1]! },
            { blockIndex: 2, clusterResourceRows: expectations.topologyClusterResourceBlocks[0]! },
          ],
        });
      }
    );

    test(
      'RHACM4K-7813: ALC: Delete a Object Storage Application with Multiple Subscriptions',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7813', '@destroy', '@ocpInterop'] },
      async ({ oc }) => {
        test.setTimeout(300_000);
        const { subscription: options } = resolveSubscriptionScenarioByTestId('RHACM4K-7813');
        await deleteObjectMultiApplicationViaOc(
          oc,
          options.applicationName,
          options.namespace
        );
      }
    );

    test(
      'RHACM4K-45792: ALC: Create an Object Storage Application Deployed on All Online Clusters and Local Cluster',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-45792', '@pre-restore', '@post-restore'] },
      async ({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const auth = skipUnlessObjectStoreAuthConfigured(test, 'RHACM4K-45792');
        if (!auth) return;

        const { subscription: baseOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-45792');
        const options = applyObjectStoreAuthToSubscriptionOptions(baseOptions, auth);
        const { applicationName, namespace } = options;

        const exists = await hubSubscriptionListIncludesAppName(oc, namespace, applicationName);
        if (!exists) {
          await applicationListPage.goto();
          await createSubscription(
            applicationListPage,
            subscriptionApplicationCreateWizardPage,
            options
          );
          await oc.labelNamespaceForAlcTest(namespace);
        }

        await verifySubscriptionObjectApplication({
          page,
          oc,
          applicationListPage,
          applicationDetailsPage,
          subscription: options,
          applicationExpectations: expectations,
          skipHubClusterResourcePoll: true,
        });
      }
    );

  }
);
