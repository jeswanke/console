import { OverviewPage } from '@pages/overview/OverviewPage';
import { SearchDetailsPage } from '@pages/search/SearchDetailsPage';
import { SearchPage } from '@pages/search/SearchPage';
import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';

type SearchFixtures = {
  oc: OcCliService;
  searchPage: SearchPage;
  searchDetailsPage: SearchDetailsPage;
  overviewPage: OverviewPage;
};

export const test = base.extend<SearchFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  searchPage: async ({ page, oc }, use) => {
    await use(new SearchPage(page, oc));
  },

  searchDetailsPage: async ({ page }, use) => {
    await use(new SearchDetailsPage(page));
  },

  overviewPage: async ({ page, oc }, use) => {
    await use(new OverviewPage(page, oc));
  },
});

export { expect };
