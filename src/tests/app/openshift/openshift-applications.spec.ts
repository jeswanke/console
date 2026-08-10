/**
 * RHACM4K-16793–16798, 45793 — Native OpenShift application ALC suite.
 *
 * Cypress: `Openshift_Application_Test_Suite.cy.js`.
 * Scenario data: `openshift.yaml`.
 */
import {
  clearE2eSpecDataCache,
  resolveOpenshiftScenarioByTestId,
  resolveOpenshiftScenarioPair,
} from '@config';
import {
  applyOpenshiftHelloworldApp,
  applyOpenshiftHelloworldAppOnCluster,
  applyOpenshiftMortgageApp,
  applyOpenshiftMortgageAppOnCluster,
  deleteOpenshiftHelloworldApp,
  deleteOpenshiftHelloworldAppOnCluster,
  deleteOpenshiftMortgageApp,
  deleteOpenshiftMortgageAppOnCluster,
  deleteOpenshiftNamespace,
  deleteOpenshiftNamespaceOnCluster,
  expectOpenshiftAppResourcesAbsent,
  shouldCreateOpenshiftResourcesForRestore,
  waitForOpenshiftAppResourcesReady,
  waitForOpenshiftAppResourcesReadyOnCluster,
} from '@lib/app/setup/openshift-apps';
import { withOpenshiftClusterName } from '@lib/app/openshift/types';
import { skipUnlessPrimaryManagedCluster } from '@lib/cluster/managedClusterContext';
import {
  verifyOpenshiftApplicationInUi,
  verifyOpenshiftApplicationRemovedFromTable,
} from '@lib/app/verify/openshift-ui';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Openshift Applications Test Suite',
  { tag: ['@openshiftApps', '@alc', '@app'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-16793: ALC: Verify OCP Application deployed on Local Cluster is shown in ACM',
      { tag: ['@RHACM4K-16793', '@e2e'] },
      async ({ oc, page, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(600_000);
        const { openshift: spec } = resolveOpenshiftScenarioByTestId('RHACM4K-16793');

        await applyOpenshiftHelloworldApp(oc, spec);
        await waitForOpenshiftAppResourcesReady(oc, spec);

        await verifyOpenshiftApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          page,
          spec,
        });

        await deleteOpenshiftHelloworldApp(oc, spec);
        await deleteOpenshiftNamespace(oc, spec.namespace);
      }
    );

    test(
      'RHACM4K-16794: ALC: Verify OCP Application deployed on Local Cluster is updated in ACM after Edit',
      { tag: ['@RHACM4K-16794', '@e2e'] },
      async ({ oc, page, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(900_000);
        const { base, edit } = resolveOpenshiftScenarioPair({
          baseTestId: 'RHACM4K-16793',
          editTestId: 'RHACM4K-16794',
        });

        await applyOpenshiftHelloworldApp(oc, base.openshift);
        await waitForOpenshiftAppResourcesReady(oc, base.openshift);

        await applyOpenshiftMortgageApp(oc, edit.openshift);
        await waitForOpenshiftAppResourcesReady(oc, edit.openshift, {
          deploymentName: edit.openshift.deployment,
        });

        await verifyOpenshiftApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          page,
          spec: edit.openshift,
        });

        await deleteOpenshiftMortgageApp(oc, edit.openshift);
        await deleteOpenshiftHelloworldApp(oc, base.openshift);
        await deleteOpenshiftNamespace(oc, base.openshift.namespace);
      }
    );

    test(
      'RHACM4K-16795: ALC: Verify OCP Application Deletion on Local Cluster is reflected in ACM',
      { tag: ['@RHACM4K-16795', '@destroy', '@e2e'] },
      async ({ oc, applicationListPage }) => {
        test.setTimeout(120_000);
        const { openshift: spec } = resolveOpenshiftScenarioByTestId('RHACM4K-16795');

        await deleteOpenshiftHelloworldApp(oc, spec);
        await expectOpenshiftAppResourcesAbsent(oc, spec);

        await verifyOpenshiftApplicationRemovedFromTable({
          applicationListPage,
          applicationName: spec.applicationName,
        });
      }
    );

    test(
      'RHACM4K-16796: ALC: Verify OCP Application deployed on a Managed Cluster is shown in ACM',
      { tag: ['@e2e', '@RHACM4K-16796'] },
      async ({ oc, page, managedClusterContext, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-16796'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;

        const { openshift: baseSpec } = resolveOpenshiftScenarioByTestId('RHACM4K-16796');
        const spec = withOpenshiftClusterName(baseSpec, managedClusterName);

        await applyOpenshiftHelloworldAppOnCluster(oc, spec, managedClusterName);
        await waitForOpenshiftAppResourcesReadyOnCluster(oc, spec, managedClusterName);

        await verifyOpenshiftApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          page,
          spec,
          clusterName: managedClusterName,
        });
      }
    );

    test(
      'RHACM4K-16797: ALC: Verify OCP Application deployed on a Managed Cluster is updated in ACM after Edit',
      { tag: ['@RHACM4K-16797', '@e2e'] },
      async ({ oc, page, managedClusterContext, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-16797'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;

        const { base, edit } = resolveOpenshiftScenarioPair({
          baseTestId: 'RHACM4K-16796',
          editTestId: 'RHACM4K-16797',
        });
        const helloworldSpec = withOpenshiftClusterName(base.openshift, managedClusterName);
        const mortgageSpec = withOpenshiftClusterName(edit.openshift, managedClusterName);

        await applyOpenshiftHelloworldAppOnCluster(oc, helloworldSpec, managedClusterName);
        await applyOpenshiftMortgageAppOnCluster(oc, mortgageSpec, managedClusterName);
        await waitForOpenshiftAppResourcesReadyOnCluster(oc, mortgageSpec, managedClusterName, {
          deploymentName: mortgageSpec.deployment,
        });

        await verifyOpenshiftApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          page,
          spec: mortgageSpec,
          clusterName: managedClusterName,
        });

        await deleteOpenshiftHelloworldAppOnCluster(oc, helloworldSpec, managedClusterName);
        await deleteOpenshiftMortgageAppOnCluster(oc, mortgageSpec, managedClusterName);
        await deleteOpenshiftNamespaceOnCluster(oc, helloworldSpec.namespace, managedClusterName);
      }
    );

    test(
      'RHACM4K-16798: ALC: Verify OCP Application Deletion on a Managed Cluster is reflected in ACM',
      { tag: ['@e2e', '@RHACM4K-16798', '@destroy'] },
      async ({ oc, managedClusterContext, applicationListPage }) => {
        test.setTimeout(300_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-16798'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;

        const { openshift: helloworldSpec } = resolveOpenshiftScenarioByTestId('RHACM4K-16796');
        const { openshift: mortgageSpec } = resolveOpenshiftScenarioByTestId('RHACM4K-16797');

        await deleteOpenshiftHelloworldAppOnCluster(
          oc,
          withOpenshiftClusterName(helloworldSpec, managedClusterName),
          managedClusterName
        );
        await deleteOpenshiftMortgageAppOnCluster(
          oc,
          withOpenshiftClusterName(mortgageSpec, managedClusterName),
          managedClusterName
        );

        await verifyOpenshiftApplicationRemovedFromTable({
          applicationListPage,
          applicationName: helloworldSpec.applicationName,
        });
        await verifyOpenshiftApplicationRemovedFromTable({
          applicationListPage,
          applicationName: mortgageSpec.nameEdit!,
        });
      }
    );

    test(
      'RHACM4K-45793: ALC: Restore Test Verify OCP Application deployed on Local Cluster is shown in ACM',
      {
        tag: ['@RHACM4K-45793', '@e2e', '@pre-restore', '@post-restore', '@create'],
      },
      async ({ oc, page, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(600_000);
        const { openshift: spec } = resolveOpenshiftScenarioByTestId('RHACM4K-45793');
        const tags = test.info().tags;

        if (shouldCreateOpenshiftResourcesForRestore(tags)) {
          await applyOpenshiftHelloworldApp(oc, spec);
        }

        await waitForOpenshiftAppResourcesReady(oc, spec);

        await verifyOpenshiftApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          page,
          spec,
        });

        if (shouldCreateOpenshiftResourcesForRestore(tags)) {
          await deleteOpenshiftHelloworldApp(oc, spec);
          await deleteOpenshiftNamespace(oc, spec.namespace);
        }
      }
    );
  }
);
