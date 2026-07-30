/**
 * RHACM4K-6883, RHACM4K-6904, RHACM4K-16864 — application/namespace name length ALC tests.
 *
 * Cypress: `Namespace_Name_Length_Test_Suite.cy.js`.
 * Scenario data: `namespace-name-length.yaml` + `_shared.yaml` git fragments.
 */
import { clearE2eSpecDataCache, resolveSubscriptionScenarioById } from '@config';
import { createSubscription } from '@lib/app/subscription';

import {
  expectHubSubscriptionAndPlacementReady,
  verifyExampleK8sAppBackendOnLocalCluster,
  verifyNamespaceLengthApplicationStatusInUi,
  withSubscriptionIdentity,
} from '@lib/app/verify/namespace-name-length';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Application supports names and namespaces with varying lengths',
  { tag: ['@e2e-common', '@e2e', '@namespace-name-length', '@alc', '@app'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-6883: ALC: Application supports names with varying lengths',
      { tag: ['@RHACM4K-6883'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const { subscription: baseOptions, applicationExpectations } = resolveSubscriptionScenarioById(
          'namespace_length_git_base'
        );
        const hubNamespace = 'application-lifecycle-ns';

        const shortNameOptions = withSubscriptionIdentity(
          baseOptions,
          'application-lifecycle-application',
          hubNamespace
        );
        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          shortNameOptions
        );
        await oc.labelNamespaceForAlcTest(hubNamespace);
        await verifyNamespaceLengthApplicationStatusInUi({
          applicationListPage,
          applicationDetailsPage,
          applicationName: shortNameOptions.applicationName,
          namespace: shortNameOptions.namespace,
        });
        await applicationListPage.deleteApplicationFromOverviewViaSearch({
          applicationName: shortNameOptions.applicationName,
          namespace: shortNameOptions.namespace,
          removeRelatedResources: true,
        });

        const longNameOptions = withSubscriptionIdentity(
          baseOptions,
          'application-lifecycle-application-quota-check',
          hubNamespace
        );
        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          longNameOptions
        );
        await expectHubSubscriptionAndPlacementReady(
          oc,
          longNameOptions.applicationName,
          longNameOptions.namespace
        );
        await verifyExampleK8sAppBackendOnLocalCluster(oc, applicationExpectations, hubNamespace);
        await applicationListPage.deleteApplicationFromOverviewViaSearch({
          applicationName: longNameOptions.applicationName,
          namespace: longNameOptions.namespace,
          removeRelatedResources: true,
        });
        await oc.deleteNamespace(hubNamespace);
      }
    );

    test(
      'RHACM4K-6904: ALC: Application supports namespaces with varying lengths',
      { tag: ['@RHACM4K-6904'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const { subscription: baseOptions, applicationExpectations } = resolveSubscriptionScenarioById(
          'namespace_length_git_base'
        );
        const applicationName = 'application-sample';
        const firstNamespace = 'application-lifecycle-application-ns';
        const secondNamespace = 'application-lifecycle-application-quota-check-ns';

        const firstOptions = withSubscriptionIdentity(baseOptions, applicationName, firstNamespace);
        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          firstOptions
        );
        await oc.labelNamespaceForAlcTest(firstNamespace);
        await expectHubSubscriptionAndPlacementReady(oc, applicationName, firstNamespace);
        await verifyExampleK8sAppBackendOnLocalCluster(oc, applicationExpectations, firstNamespace);
        await applicationListPage.deleteApplicationFromOverviewViaSearch({
          applicationName,
          namespace: firstNamespace,
          removeRelatedResources: true,
        });

        const secondOptions = withSubscriptionIdentity(baseOptions, applicationName, secondNamespace);
        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          secondOptions
        );
        await oc.labelNamespaceForAlcTest(secondNamespace);
        await expectHubSubscriptionAndPlacementReady(oc, applicationName, secondNamespace);
        await verifyExampleK8sAppBackendOnLocalCluster(oc, applicationExpectations, secondNamespace);
        await applicationListPage.deleteApplicationFromOverviewViaSearch({
          applicationName,
          namespace: secondNamespace,
          removeRelatedResources: true,
        });

        await oc.deleteNamespace(secondNamespace);
        await oc.deleteNamespace(firstNamespace);
      }
    );

  }
);
