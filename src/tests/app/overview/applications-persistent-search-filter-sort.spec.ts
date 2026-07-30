/**
 * RHACM4K-61329 — persistent search, sort, and filters on Applications list.
 *
 * Cypress: `Application_Persistent_Search_Filter_Sort_Test_Suite.cy.js`.
 */
import { test, expect } from '@fixtures/app-test';
import { APP_PERSISTENT_LIST_TOOLBAR } from '@constants/app';
import {
  applyApplicationsListToolbarState,
  expectApplicationsListToolbarStatePersisted,
  openApplicationDetailsTopologyFromListRow,
} from '@lib/app/verify/applications-list-persistent-toolbar';

test.describe(
  'Application Lifecycle UI: Persistent search, sort, and filters (RHACM4K-61329)',
  { tag: ['@applications', '@e2e', '@app', '@alc'] },
  () => {
    test.use({ viewport: { width: 2560, height: 1440 } });

    test(
      'RHACM4K-61329: ALC: As an application admin, I want to have persistent search, sort, and filters in the application list',
      { tag: ['@RHACM4K-61329'] },
      async ({ applicationListPage, applicationDetailsPage, page }) => {
        test.setTimeout(300_000);

        const table = applicationListPage.applicationsTable;
        await applicationListPage.goto();
        await applicationListPage.waitForLoad();

        if ((await table.getDataRowCount()) === 0) {
          test.skip(true, 'No applications on hub — persistent toolbar test needs list data');
        }

        await table.search(APP_PERSISTENT_LIST_TOOLBAR.searchQuery);
        await applicationListPage.waitForLoad();
        if ((await table.getDataRowCount()) === 0) {
          test.skip(
            true,
            `No applications match search "${APP_PERSISTENT_LIST_TOOLBAR.searchQuery}" — need AAP/ansible apps on hub`
          );
        }

        await table.openFilter();
        const openshiftFilter = table.getFilterOption(APP_PERSISTENT_LIST_TOOLBAR.typeFilter);
        if ((await openshiftFilter.count()) === 0) {
          test.skip(true, 'OpenShift Type filter unavailable — hub has no OpenShift applications');
        }
        await page.keyboard.press('Escape');

        const toolbarState = await test.step(
          'Apply search, Type filter, and Pod Status sort',
          async () => applyApplicationsListToolbarState({ applicationListPage })
        );
        expect(toolbarState.podStatusSort).toBeTruthy();

        await test.step('Open application details topology from filtered row', async () => {
          await openApplicationDetailsTopologyFromListRow(
            table,
            applicationDetailsPage,
            APP_PERSISTENT_LIST_TOOLBAR.searchQuery
          );
        });

        await test.step('Return via breadcrumb and verify toolbar state persisted', async () => {
          await applicationDetailsPage.returnToApplicationsListViaBreadcrumb();
          await applicationListPage.waitForLoad();
          await expectApplicationsListToolbarStatePersisted(applicationListPage, toolbarState);
        });
      }
    );
  }
);
