import { OverviewPage } from '@pages/overview/OverviewPage';
import { SearchDetailsPage } from '@pages/search/SearchDetailsPage';
import { SearchPage } from '@pages/search/SearchPage';
import { expect } from '@playwright/test';
import { test as base } from '@fixtures/cdp-base';
import { OcCliService } from '@services/OcCliService';
import { generateSafeName } from '@utils/kube-helper';

type SearchFixtures = {
  oc: OcCliService;
  uniqueName: string;
  searchPage: SearchPage;
  searchDetailsPage: SearchDetailsPage;
  overviewPage: OverviewPage;
};

export const test = base.extend<SearchFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  uniqueName: async ({}, use) => {
    await use(generateSafeName('search'));
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
