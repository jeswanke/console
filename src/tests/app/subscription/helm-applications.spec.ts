/**
 * RHACM4K-46737, 7486–7489, 7560–7564, 45791 — Helm subscription ALC suite.
 *
 * Cypress: `Helm_Application_Test_Suite.cy.js`.
 * Scenario data: `helm-applications.yaml` + `_shared.yaml` helm fragments.
 */
import { clearE2eSpecDataCache, resolveSubscriptionScenarioByTestId } from '@config';
import {
  addSubscriptionToExistingApplication,
  applyManagedClusterPlacementToBlocks,
  createSubscription,
  deleteSubscriptionFromExistingApplication,
} from '@lib/app/subscription';
import { deleteHelmMultiApplicationViaOc } from '@lib/app/setup/helm-subscription-api';
import { skipUnlessPrimaryManagedCluster } from '@lib/cluster/managedClusterContext';
import {
  subscriptionDetailsClusterResourceTotalPattern,
  verifySubscriptionAppDetailsTab,
} from '@lib/app/verify/details-tab';
import { verifySubscriptionAppTopologyTab } from '@lib/app/verify/topology-tab';
import { verifySubscriptionHelmApplication } from '@lib/app/verify/validate-subscription-helm-application';
import { hubSubscriptionListIncludesAppName } from '@lib/app/verify/validate-subscription-git-application';
import { expect, test } from '@fixtures/app-test';

test.describe(
  'ALC: Helm Application Test Suite',
  { tag: ['@fresh-install', '@placement', '@helm-apps', '@alc', '@app'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-46737: ALC: Create a Helm Application Deployed on A Specific Cluster',
      { tag: ['@RHACM4K-46737', '@pre-upgrade', '@post-upgrade'] },
      async ({
        page,
        oc,
        managedClusterContext,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-46737'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;

        const { subscription: baseOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-46737');
        const options = applyManagedClusterPlacementToBlocks(baseOptions, managedClusterName, 0);
        const { applicationName, namespace } = options;

        if (!(await oc.applicationsAppK8sIoExists(namespace, applicationName))) {
          await applicationListPage.goto();
          await createSubscription(
            applicationListPage,
            subscriptionApplicationCreateWizardPage,
            page,
            options
          );
          await oc.labelNamespaceForAlcTest(namespace);
        }

        await verifySubscriptionHelmApplication({
          page,
          oc,
          applicationListPage,
          applicationDetailsPage,
          subscription: options,
          applicationExpectations: expectations,
          managedClusterName,
        });
      }
    );

    test(
      'RHACM4K-7486: ALC: Create a Helm Application Deployed on a Specific Cluster',
      {
        tag: ['@e2e-common', '@e2e', '@RHACM4K-7486', '@create', '@ocpInterop', '@post-release'],
      },
      async ({
        page,
        oc,
        managedClusterContext,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-7486'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;

        const { subscription: baseOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-7486');
        const options = applyManagedClusterPlacementToBlocks(baseOptions, managedClusterName, 0);

        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          page,
          options
        );
        await oc.labelNamespaceForAlcTest(options.namespace);

        await verifySubscriptionHelmApplication({
          page,
          oc,
          applicationListPage,
          applicationDetailsPage,
          subscription: options,
          applicationExpectations: expectations,
          managedClusterName,
        });
      }
    );

    test(
      'RHACM4K-7489: ALC: Delete a Helm Application Deployed on a Specific Cluster',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7489', '@destroy', '@ocpInterop'] },
      async ({ oc }) => {
        test.setTimeout(120_000);
        const { subscription: options } = resolveSubscriptionScenarioByTestId('RHACM4K-7489');
        await oc.deleteNamespace(options.namespace);
      }
    );

    test(
      'RHACM4K-7560: ALC: Create a Helm Application with Multiple Subscriptions',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7560', '@create', '@ocpInterop', '@post-upgrade'] },
      async ({
        page,
        oc,
        managedClusterContext,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-7560'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;

        const { subscription: baseOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-7560');
        const options = applyManagedClusterPlacementToBlocks(baseOptions, managedClusterName, 0);
        expect(options.repositories).toHaveLength(2);

        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          page,
          options
        );
        await oc.labelNamespaceForAlcTest(options.namespace);

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
          clusterResourceStatusPattern: subscriptionDetailsClusterResourceTotalPattern(
            expectations.clusterResources[0]!.length
          ),
          detailsValuesTimeout: 300_000,
        });

        await applicationDetailsPage.navigateToApplicationTab(
          namespace,
          applicationName,
          'topology'
        );
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
      'RHACM4K-7563: ALC: Delete A Helm Subscription from an Existing Multi-Subscription Helm Application',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7563', '@edit', '@post-upgrade'] },
      async ({
        page,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(300_000);
        const { subscription: options, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-7563');
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
      'RHACM4K-7562: ALC: Add A Helm Subscription to An Existing Helm Application',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7562', '@edit', '@post-upgrade'] },
      async ({
        page,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(300_000);
        const { subscription: addOptions } = resolveSubscriptionScenarioByTestId('RHACM4K-7562');
        const { subscription: multiOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-7560');
        expect(addOptions.repositories).toHaveLength(1);

        await addSubscriptionToExistingApplication(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          page,
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
      'RHACM4K-7564: ALC: Delete a Helm Application with Multiple Subscriptions',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-7564', '@destroy', '@ocpInterop', '@post-upgrade'] },
      async ({ oc }) => {
        test.setTimeout(300_000);
        const { subscription: options } = resolveSubscriptionScenarioByTestId('RHACM4K-7564');
        await deleteHelmMultiApplicationViaOc(oc, options.applicationName, options.namespace);
      }
    );

    test(
      'RHACM4K-45791: ALC: Restore Test Create a Helm Application with Multiple Subscriptions',
      { tag: ['@e2e-common', '@e2e', '@RHACM4K-45791', '@pre-restore', '@post-restore'] },
      async ({
        page,
        oc,
        managedClusterContext,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-45791'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;

        const { subscription: baseOptions, applicationExpectations: expectations } =
          resolveSubscriptionScenarioByTestId('RHACM4K-45791');
        const options = applyManagedClusterPlacementToBlocks(baseOptions, managedClusterName, 0);
        const { applicationName, namespace } = options;

        const exists = await hubSubscriptionListIncludesAppName(oc, namespace, applicationName);
        if (!exists) {
          await applicationListPage.goto();
          await createSubscription(
            applicationListPage,
            subscriptionApplicationCreateWizardPage,
            page,
            options
          );
          await oc.labelNamespaceForAlcTest(namespace);
        }

        await applicationDetailsPage.navigateToApplicationTab(
          namespace,
          applicationName,
          'details'
        );
        await verifySubscriptionAppDetailsTab({
          page,
          detailsPage: applicationDetailsPage,
          applicationName,
          namespace,
          applicationExpectations: expectations,
          repositories: options.repositories,
          detailsValuesTimeout: 300_000,
        });

        await applicationDetailsPage.navigateToApplicationTab(
          namespace,
          applicationName,
          'topology'
        );
        await verifySubscriptionAppTopologyTab({
          page,
          detailsPage: applicationDetailsPage,
          applicationName,
          namespace,
          mergedSubscriptionBlocks: [
            { blockIndex: 1, clusterResourceRows: expectations.topologyClusterResourceBlocks[0]! },
            { blockIndex: 2, clusterResourceRows: expectations.topologyClusterResourceBlocks[1]! },
          ],
          subscriptionScope: 'all',
        });
      }
    );
  }
);
