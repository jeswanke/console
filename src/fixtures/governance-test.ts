import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { GovernancePage } from '@pages/governance/GovernancePage';
import { PolicyTemplateDetailsPage } from '@pages/governance/PolicyTemplateDetailsPage';

type GovernanceFixtures = {
  oc: OcCliService;
  governancePage: GovernancePage;
  policyTemplateDetailsPage: PolicyTemplateDetailsPage;
};

export const test = base.extend<GovernanceFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  governancePage: async ({ page, oc }, use) => {
    await use(new GovernancePage(page, oc));
  },

  policyTemplateDetailsPage: async ({ page }, use) => {
    await use(new PolicyTemplateDetailsPage(page));
  },
});

export { expect };
