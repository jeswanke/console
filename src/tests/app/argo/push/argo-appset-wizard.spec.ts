/**
 * RHACM4K-6735 / RHACM4K-6773 — Argo ApplicationSet wizard edit flows.
 *
 * Cypress: `Argo_Appset_Wizard_Test_Suite.cy.js` (@UI cases).
 */
import { clearE2eSpecDataCache, resolveArgoPushScenarioByTestId } from '@config';
import { cleanupArgoPushApplication } from '@lib/app/argo-push';
import { editArgoPushApplicationGitPathAndVerifyTopology } from '@lib/app/argo-push/edit-wizard-path';
import { ensureLocalClusterMatchingLabelForArgoAppTable } from '@lib/app/verify/argo-app-table-setup';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Argo Appset Wizard Test Suite',
  { tag: ['@alc', '@gitops', '@argo-wizard', '@e2e'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-6735: ALC: Edit an existing Argo appset via wizard (mortgage path)',
      { tag: ['@RHACM4K-6735', '@e2e'] },
      async ({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPushApplicationCreateWizardPage,
      }) => {
        test.setTimeout(600_000);
        const { argoPush } = resolveArgoPushScenarioByTestId('RHACM4K-6735');
        await ensureLocalClusterMatchingLabelForArgoAppTable(oc, 'name', 'local-cluster');
        try {
          await editArgoPushApplicationGitPathAndVerifyTopology({
            page,
            oc,
            applicationListPage,
            applicationDetailsPage,
            wizard: argoPushApplicationCreateWizardPage,
            argoPush,
            newGitPath: 'mortgage',
          });
        } finally {
          await cleanupArgoPushApplication(oc, argoPush);
        }
      }
    );

    test(
      'RHACM4K-6773: ALC: Edit deployed Argo appset path back to helloworld-argo via wizard',
      { tag: ['@RHACM4K-6773', '@e2e'] },
      async ({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPushApplicationCreateWizardPage,
      }) => {
        test.setTimeout(600_000);
        const { argoPush } = resolveArgoPushScenarioByTestId('RHACM4K-6773');
        await ensureLocalClusterMatchingLabelForArgoAppTable(oc, 'name', 'local-cluster');
        try {
          await editArgoPushApplicationGitPathAndVerifyTopology({
            page,
            oc,
            applicationListPage,
            applicationDetailsPage,
            wizard: argoPushApplicationCreateWizardPage,
            argoPush,
            newGitPath: 'helloworld-argo',
          });
        } finally {
          await cleanupArgoPushApplication(oc, argoPush);
        }
      }
    );
  }
);
