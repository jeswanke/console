/**
 * RHACM4K-61329 — persistent search, Type filter, and column sort on Applications list.
 * Cypress: `Application_Persistent_Search_Filter_Sort_Test_Suite.cy.js`.
 */
import { expect } from '@playwright/test';
import { APP_PERSISTENT_LIST_TOOLBAR } from '@constants/app';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ApplicationsTable } from '@components/app/ApplicationsTable';

export type ApplicationsListToolbarState = {
  searchQuery: string;
  typeFilterLabel: string;
  sortColumn: string;
  podStatusSort: string | null;
};

export type ApplyApplicationsListToolbarStateParams = {
  applicationListPage: ApplicationListPage;
  searchQuery?: string;
  typeFilterLabel?: string;
  sortColumn?: string;
  sortHeaderClicks?: number;
};

/** Applies toolbar search, Type filter, and column sort; returns state for later persistence checks. */
export async function applyApplicationsListToolbarState(
  params: ApplyApplicationsListToolbarStateParams
): Promise<ApplicationsListToolbarState> {
  const {
    applicationListPage,
    searchQuery = APP_PERSISTENT_LIST_TOOLBAR.searchQuery,
    typeFilterLabel = APP_PERSISTENT_LIST_TOOLBAR.typeFilter,
    sortColumn = APP_PERSISTENT_LIST_TOOLBAR.sortColumn,
    sortHeaderClicks = APP_PERSISTENT_LIST_TOOLBAR.sortHeaderClicks,
  } = params;

  const table = applicationListPage.applicationsTable;
  await applicationListPage.goto();
  await applicationListPage.waitForLoad();

  await table.search(searchQuery);
  await applicationListPage.waitForLoad();
  await expect(table.getDataRows().first()).toBeVisible({ timeout: 15_000 });

  await table.selectFilterOption(typeFilterLabel);
  await applicationListPage.waitForLoad();

  const podStatusSort = await table.sortColumnByHeaderClicks(sortColumn, sortHeaderClicks);

  return { searchQuery, typeFilterLabel, sortColumn, podStatusSort };
}

/** Opens the first matching application details and asserts topology is shown (Cypress step 4). */
export async function openApplicationDetailsTopologyFromListRow(
  table: ApplicationsTable,
  applicationDetailsPage: ApplicationDetailsPage,
  rowText: string
): Promise<void> {
  await table.openApplicationDetailsFromFirstRowContaining(rowText);
  await applicationDetailsPage.expectOnApplicationDetailsRoute();
  await applicationDetailsPage.expectTopologyGraphVisible();
}

/** Breadcrumb back to list and assert search / filter / sort persisted (Cypress step 5). */
export async function expectApplicationsListToolbarStatePersisted(
  applicationListPage: ApplicationListPage,
  state: ApplicationsListToolbarState
): Promise<void> {
  const table = applicationListPage.applicationsTable;

  await expect(applicationListPage.getSearchInput()).toHaveValue(state.searchQuery);
  await applicationListPage.expectFilterLabelVisibleInToolbar(state.typeFilterLabel);

  const sortHeader = table.getColumnHeaderByDataLabel(state.sortColumn);
  await expect(sortHeader).toBeVisible();
  if (state.podStatusSort) {
    await expect(sortHeader).toHaveAttribute('aria-sort', state.podStatusSort);
  }
  await expect(sortHeader).toHaveClass(/pf-m-selected/);
  await expect(table.getClearAllFiltersButton()).toBeVisible();
}
