/**
 * RHACM4K-6772 / RHACM4K-6774 / RHACM4K-7006 — Argo ApplicationSet row actions.
 *
 * Cypress: `Argo_Appset_Row_Action_Test_Suite.cy.js` (@UI cases).
 */
import { clearE2eSpecDataCache, resolveArgoPushScenarioByTestId } from '@config';
import { createArgoPushApplicationIfMissing } from '@lib/app/argo-push';
import {
  editApplicationSetFromRowActions,
  searchApplicationSetFromRowActions,
  viewApplicationSetFromRowActions,
} from '@lib/app/verify/argo-appset-row-actions';
import { ensureLocalClusterMatchingLabelForArgoAppTable } from '@lib/app/verify/argo-app-table-setup';
import { test } from '@fixtures/app-test';

const MATCHING_LABEL_KEY = 'test';
const MATCHING_LABEL_VALUE = 'auto';

test.describe(
  'Application Lifecycle UI: Argo Appset Row Action Test Suite',
  { tag: ['@alc', '@gitops', '@argo-row-action', '@e2e'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-6772: ALC: View deployed Argo appsets via row action View',
      { tag: ['@RHACM4K-6772', '@e2e'] },
      async ({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPushApplicationCreateWizardPage,
      }) => {
        test.setTimeout(600_000);
        const { argoPush } = resolveArgoPushScenarioByTestId('RHACM4K-6772');
        await ensureLocalClusterMatchingLabelForArgoAppTable(
          oc,
          MATCHING_LABEL_KEY,
          MATCHING_LABEL_VALUE
        );
        await createArgoPushApplicationIfMissing(
          oc,
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          page,
          argoPush
        );
        await viewApplicationSetFromRowActions(
          applicationListPage,
          applicationDetailsPage,
          argoPush.applicationName
        );
      }
    );

    test(
      'RHACM4K-6774: ALC: Search from row action for Argo AppSet',
      { tag: ['@RHACM4K-6774', '@e2e'] },
      async ({ page, oc, applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(600_000);
        const { argoPush } = resolveArgoPushScenarioByTestId('RHACM4K-6774');
        await ensureLocalClusterMatchingLabelForArgoAppTable(
          oc,
          MATCHING_LABEL_KEY,
          MATCHING_LABEL_VALUE
        );
        await createArgoPushApplicationIfMissing(
          oc,
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          page,
          argoPush
        );
        await searchApplicationSetFromRowActions(
          applicationListPage,
          page,
          argoPush.applicationName,
          argoPush.applicationSetNamespace ?? argoPush.argoServerLabel
        );
      }
    );

    test(
      'RHACM4K-7006: ALC: View, Edit, and Search row actions for Argo AppSet',
      { tag: ['@RHACM4K-7006', '@e2e', '@post-release'] },
      async ({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPushApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);
        const { argoPush } = resolveArgoPushScenarioByTestId('RHACM4K-7006');
        await ensureLocalClusterMatchingLabelForArgoAppTable(
          oc,
          MATCHING_LABEL_KEY,
          MATCHING_LABEL_VALUE
        );
        await createArgoPushApplicationIfMissing(
          oc,
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          page,
          argoPush
        );
        await viewApplicationSetFromRowActions(
          applicationListPage,
          applicationDetailsPage,
          argoPush.applicationName
        );
        await editApplicationSetFromRowActions(applicationListPage, page, argoPush.applicationName);
        await searchApplicationSetFromRowActions(
          applicationListPage,
          page,
          argoPush.applicationName,
          argoPush.applicationSetNamespace ?? argoPush.argoServerLabel
        );
      }
    );
  }
);
