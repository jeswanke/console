import { expect } from '@playwright/test';

import { APP_COMPARE_POPOVER, APP_CREATE_MENU, APP_TOOLBAR } from '@constants/app';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';

/** RHACM4K-42704: Compare application types popover shows all application kinds. */
export async function verifyCompareApplicationTypesPopover(
  applicationListPage: ApplicationListPage
): Promise<void> {
  await applicationListPage.goto();
  const table = applicationListPage.applicationsTable;
  // Cypress `navigateApplication()` opens Create application, then clicks Compare.
  await applicationListPage.openCreateApplication();
  await applicationListPage.getPage().getByRole('button', { name: APP_TOOLBAR.compareTypesLabel }).click();

  const popover = table.getCompareApplicationTypesPopover();
  await expect(popover).toBeVisible();
  await expect(popover.getByRole('heading', { name: APP_COMPARE_POPOVER.title })).toBeVisible();

  const body = table.getComparePopoverBody();
  await expect(body).toContainText(APP_CREATE_MENU.options.argoPullModel);
  await expect(body).toContainText(APP_CREATE_MENU.options.argoPushModel);
  await expect(body).toContainText(APP_CREATE_MENU.options.subscription);

  await applicationListPage.getPage().getByRole('button', { name: APP_TOOLBAR.compareTypesLabel }).click();
}
