/**
 * RHACM4K-54897 / RHACM4K-54902 — Application Manager ManagedServiceAccount long-lived secret.
 *
 * Cypress: `Argo_Long_Lived_Secret_Test_Suite.cy.js`.
 */
import { clearE2eSpecDataCache, resolveArgoPushScenarioByTestId } from '@config';
import {
  runLongLivedSecret54897Scenario,
  runLongLivedSecret54902Scenario,
} from '@lib/app/verify/argo-long-lived-secret';
import { getRepoRoot } from '@lib/repo-root';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Argo Long Lived Secret Test Suite',
  { tag: ['@ALC', '@e2e-argo', '@gitops', '@argo-long-lived-secret'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    const managedClusterName =
      process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || 'local-cluster';

    test.beforeEach(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-54897: Verify Application Manager ManagedServiceAccount secret creation',
      { tag: ['@RHACM4K-54897', '@UI', '@e2e-argo'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPushApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const { argoPush } = resolveArgoPushScenarioByTestId('RHACM4K-54897');
        await runLongLivedSecret54897Scenario({
          oc,
          applicationListPage,
          applicationDetailsPage,
          argoPushApplicationCreateWizardPage,
          argoPush,
          clusterName: managedClusterName,
        });
      }
    );

    test(
      'RHACM4K-54902: Verify ManagedServiceAccount secret after delete and recreate',
      { tag: ['@RHACM4K-54902', '@UI', '@e2e-argo'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPushApplicationCreateWizardPage,
      }) => {
        test.setTimeout(1_800_000);
        const { argoPush } = resolveArgoPushScenarioByTestId('RHACM4K-54902');
        await runLongLivedSecret54902Scenario({
          oc,
          applicationListPage,
          applicationDetailsPage,
          argoPushApplicationCreateWizardPage,
          argoPush,
          clusterName: managedClusterName,
          repoRoot: getRepoRoot(),
        });
      }
    );
  }
);
