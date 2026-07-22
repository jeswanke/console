/**
 * RHACM4K-61942 — Push model ApplicationSet manual sync.
 *
 * Cypress: `Argo_Push_Model_Sync_Test_Suite.cy.js`.
 */
import { clearE2eSpecDataCache, resolveArgoPushScenarioByTestId } from '@config';
import { cleanupArgoPushApplication } from '@lib/app/argo-push';
import { runArgoPushManualSyncScenario } from '@lib/app/verify/argo-push-manual-sync';
import { ensureLocalClusterMatchingLabelForArgoAppTable } from '@lib/app/verify/argo-app-table-setup';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Argo CD ApplicationSet Push Model - Manual sync',
  { tag: ['@ALC', '@gitops', '@e2e-argo', '@applicationset', '@push-model'] },
  () => {
    test(
      'RHACM4K-61942: ALC: Manually sync an ApplicationSet created with automated sync disabled',
      { tag: ['@RHACM4K-61942', '@UI', '@applicationset'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPushApplicationCreateWizardPage,
      }) => {
        test.setTimeout(600_000);
        clearE2eSpecDataCache();
        const { argoPush } = resolveArgoPushScenarioByTestId('RHACM4K-61942');
        await ensureLocalClusterMatchingLabelForArgoAppTable(oc, 'name', 'local-cluster');
        try {
          await runArgoPushManualSyncScenario({
            oc,
            applicationListPage,
            applicationDetailsPage,
            argoPushApplicationCreateWizardPage,
            argoPush,
          });
        } finally {
          await cleanupArgoPushApplication(oc, argoPush);
        }
      }
    );
  }
);
