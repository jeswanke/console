/**
 * RHACM4K-6902 / RHACM4K-6903 — Argo ApplicationSet vs Subscription on Applications Overview table.
 *
 * Cypress: `Argo_App_Table_Test_Suite.cy.js` (@UI cases only).
 */
import {
  clearE2eSpecDataCache,
  resolveArgoPushScenarioById,
  resolveSubscriptionScenarioById,
} from '@config';
import {
  cleanupArgoAppTableTestApplications,
  ensureArgoAppTableFixtures,
} from '@lib/app/verify/argo-app-table-setup';
import {
  verifyApplicationTypeColumnOnOverviewTable,
  verifyApplicationTypeFiltersOnOverviewTable,
} from '@lib/app/verify/applications-table-type-filter';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Argo Application Type Table Test Suite',
  { tag: ['@gitops', '@argo-app-table', '@app', '@alc', '@argo'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test.afterEach(async ({ oc }) => {
      const { argoPush } = resolveArgoPushScenarioById('argo_app_table_helloworld_argo_auto');
      const { subscription } = resolveSubscriptionScenarioById('auto_git_multi');
      await cleanupArgoAppTableTestApplications(oc, argoPush, subscription);
    });

    test(
      'RHACM4K-6902: ALC: The user should be able to filter between application types on the Application table page',
      { tag: ['@RHACM4K-6902', '@e2e'] },
      async ({
        page,
        oc,
        applicationListPage,
        argoPushApplicationCreateWizardPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);

        const { argoPush, subscription } = await ensureArgoAppTableFixtures({
          page,
          oc,
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          subscriptionApplicationCreateWizardPage,
        });

        await verifyApplicationTypeFiltersOnOverviewTable({
          applicationListPage,
          applicationSetName: argoPush.applicationName,
          subscriptionName: subscription.applicationName,
        });
      }
    );

    test(
      'RHACM4K-6903: ALC: Verify type column on application table page works correctly',
      { tag: ['@RHACM4K-6903', '@e2e'] },
      async ({
        page,
        oc,
        applicationListPage,
        argoPushApplicationCreateWizardPage,
        subscriptionApplicationCreateWizardPage,
      }) => {
        test.setTimeout(900_000);

        const { argoPush, subscription } = await ensureArgoAppTableFixtures({
          page,
          oc,
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          subscriptionApplicationCreateWizardPage,
        });

        await verifyApplicationTypeColumnOnOverviewTable({
          applicationListPage,
          applicationSetName: argoPush.applicationName,
          subscriptionName: subscription.applicationName,
        });
      }
    );
  }
);
