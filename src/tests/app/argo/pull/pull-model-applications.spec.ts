/**
 * RHACM4K-38202, 42703, 42705, 60049 — Argo CD pull-model @UI tests.
 *
 * Cypress: `Pull_Model_Git_Test_Suite.cy.js`, `Pull_Model_Helm_Test_Suite.cy.js`.
 * Scenario data: `argo-push.yaml` (`argo_pull_*` scenarios).
 */
import { clearE2eSpecDataCache, resolveArgoPushScenarioByTestId } from '@config';
import { deleteApplicationSetFromList } from '@lib/app/argo-push/delete-appset-ui';
import {
  applyPullModelIncludeLocalGitAppSet,
  applyPullModelPlacementExcludeLocalCluster,
  cleanupPullModelIncludeLocalGitAppSet,
  isLocalClusterInPlacementDecision,
} from '@lib/app/argo-pull/apply-cli-appset';
import { cleanupArgoPullApplication, createArgoPullApplication } from '@lib/app/argo-pull';
import { setupArgoPullDestinationNamespace } from '@lib/app/argo-pull/setup-managed-destination-ns';
import { skipUnlessPrimaryManagedCluster } from '@lib/cluster/managedClusterContext';
import {
  cleanupArgoPullManualSyncScenario,
  runArgoPullManualSyncScenario,
} from '@lib/app/verify/argo-pull-manual-sync';
import {
  APP_ARGO_PULL_TOPOLOGY_WARNINGS,
  openArgoPullApplicationFromOverviewTable,
  verifyArgoPullApplicationOverviewTable,
  verifyArgoPullApplicationTopology,
  verifyArgoPullHubTopologyWarning,
  waitForPullModelMcasrSyncedAndHealthy,
} from '@lib/app/verify/argo-pull-ui';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Pull Model Applications Test Suite',
  { tag: ['@e2e', '@pullmodel', '@alc', '@app', '@gitops', '@argo'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-38202: ALC: Topology and app table display correctly for pull model',
      { tag: ['@RHACM4K-38202'] },
      async ({ oc, applicationListPage, applicationDetailsPage, managedClusterContext }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-38202'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;
        const { argoPush: options } = resolveArgoPushScenarioByTestId('RHACM4K-38202');

        await setupArgoPullDestinationNamespace(oc, managedClusterName, options.destinationNamespace);
        await applyPullModelIncludeLocalGitAppSet(oc, options);
        await waitForPullModelMcasrSyncedAndHealthy(oc, options, managedClusterName);

        await verifyArgoPullApplicationOverviewTable({
          applicationListPage,
          options,
          managedClusterName,
        });
        await openArgoPullApplicationFromOverviewTable(applicationListPage, options.applicationName);
        await verifyArgoPullApplicationTopology({
          applicationDetailsPage,
          options,
          managedClusterName,
        });

        const hubTargeted = await isLocalClusterInPlacementDecision(oc, options);
        if (hubTargeted) {
          await verifyArgoPullHubTopologyWarning(
            applicationDetailsPage,
            options.applicationName,
            APP_ARGO_PULL_TOPOLOGY_WARNINGS.hubClusterNotSupported
          );

          await applyPullModelPlacementExcludeLocalCluster(oc, options);
          await waitForPullModelMcasrSyncedAndHealthy(oc, options, managedClusterName);

          await verifyArgoPullApplicationOverviewTable({
            applicationListPage,
            options,
            managedClusterName,
          });
          await openArgoPullApplicationFromOverviewTable(
            applicationListPage,
            options.applicationName
          );
          await verifyArgoPullApplicationTopology({
            applicationDetailsPage,
            options,
            managedClusterName,
          });
          await verifyArgoPullHubTopologyWarning(
            applicationDetailsPage,
            options.applicationName,
            APP_ARGO_PULL_TOPOLOGY_WARNINGS.localClusterNotSupported,
            { expectAbsent: true }
          );
        }

        await cleanupPullModelIncludeLocalGitAppSet(oc, options);
      }
    );

    test(
      'RHACM4K-42703: ALC: Git Pull model type application set can be created successfully on UI',
      { tag: ['@RHACM4K-42703'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPullApplicationCreateWizardPage: pullWizard,
        managedClusterContext,
      }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-42703'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;
        const { argoPush: options } = resolveArgoPushScenarioByTestId('RHACM4K-42703');

        await cleanupArgoPullApplication(oc, options);
        await setupArgoPullDestinationNamespace(oc, managedClusterName, options.destinationNamespace);
        await createArgoPullApplication(applicationListPage, pullWizard, options);
        await waitForPullModelMcasrSyncedAndHealthy(oc, options, managedClusterName);

        await verifyArgoPullApplicationOverviewTable({
          applicationListPage,
          options,
          managedClusterName,
          assertStatusGreenCounts: true,
        });
        await openArgoPullApplicationFromOverviewTable(applicationListPage, options.applicationName);
        await verifyArgoPullApplicationTopology({
          applicationDetailsPage,
          options,
          managedClusterName,
        });

        await deleteApplicationSetFromList(applicationListPage, oc, options.applicationName, {
          argoServerNamespace: options.argoServerLabel,
        });
      }
    );

    test(
      'RHACM4K-42705: ALC: Helm Pull model type application set can be created successfully on UI',
      { tag: ['@RHACM4K-42705'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPullApplicationCreateWizardPage: pullWizard,
        managedClusterContext,
      }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-42705'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;
        const { argoPush: options } = resolveArgoPushScenarioByTestId('RHACM4K-42705');

        await cleanupArgoPullApplication(oc, options);
        await setupArgoPullDestinationNamespace(oc, managedClusterName, options.destinationNamespace);
        await createArgoPullApplication(applicationListPage, pullWizard, options);
        await waitForPullModelMcasrSyncedAndHealthy(oc, options, managedClusterName, {
          timeout: 300_000,
        });

        await verifyArgoPullApplicationOverviewTable({
          applicationListPage,
          options,
          managedClusterName,
        });
        await openArgoPullApplicationFromOverviewTable(applicationListPage, options.applicationName);
        await verifyArgoPullApplicationTopology({
          applicationDetailsPage,
          options,
          managedClusterName,
        });

        await deleteApplicationSetFromList(applicationListPage, oc, options.applicationName, {
          argoServerNamespace: options.argoServerLabel,
        });
      }
    );

    test(
      'RHACM4K-60049: ALC: Sync Argo CD Pull Model ApplicationSet on Console',
      { tag: ['@RHACM4K-60049'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        managedClusterContext,
      }) => {
        test.setTimeout(900_000);
        const managedCluster = skipUnlessPrimaryManagedCluster(
          test,
          managedClusterContext,
          'RHACM4K-60049'
        );
        if (!managedCluster) return;
        const managedClusterName =
          process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || managedCluster.name;
        const { argoPush: options } = resolveArgoPushScenarioByTestId('RHACM4K-60049');

        await runArgoPullManualSyncScenario({
          oc,
          applicationListPage,
          applicationDetailsPage,
          options,
          managedClusterName,
        });
        await cleanupArgoPullManualSyncScenario(oc, options, managedClusterName);
      }
    );
  }
);
