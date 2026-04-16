import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { ApplicationListPage } from '@pages/app/ApplicationListPage';
import { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

type AppFixtures = {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  subscriptionApplicationCreateWizardPage: SubscriptionApplicationCreateWizardPage;
};

export const test = base.extend<AppFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  applicationListPage: async ({ page, oc }, use) => {
    await use(new ApplicationListPage(page, oc));
  },

  subscriptionApplicationCreateWizardPage: async ({ page, oc }, use) => {
    await use(new SubscriptionApplicationCreateWizardPage(page, oc));
  },
});

export { expect };
