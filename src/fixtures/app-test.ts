import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { ApplicationListPage } from '@pages/app/ApplicationListPage';

type AppFixtures = {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
};

export const test = base.extend<AppFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  applicationListPage: async ({ page, oc }, use) => {
    await use(new ApplicationListPage(page, oc));
  },
});

export { expect };
