import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { ApplicationListPage } from '@pages/app/ApplicationListPage';
import { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

type AppFixtures = {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  subscriptionApplicationCreateWizardPage: SubscriptionApplicationCreateWizardPage;
};

export const test = base.extend<AppFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  applicationListPage: async ({ page, oc }, use) => {
    await use(new ApplicationListPage(page, oc));
  },

  applicationDetailsPage: async ({ page, oc }, use) => {
    await use(new ApplicationDetailsPage(page, oc));
  },

  subscriptionApplicationCreateWizardPage: async ({ page, oc }, use) => {
    await use(new SubscriptionApplicationCreateWizardPage(page, oc));
  },
});

export { expect };
