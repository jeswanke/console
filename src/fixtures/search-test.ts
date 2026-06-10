import { SearchPage } from '@pages/search/SearchPage';
import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';

type SearchFixtures = {
  oc: OcCliService;
  searchPage: SearchPage;
};

export const test = base.extend<SearchFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  searchPage: async ({ page, oc }, use) => {
    await use(new SearchPage(page, oc));
  },
});

export { expect };
