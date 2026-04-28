import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { PolicyService } from '@services/domains/PolicyService';
import { GovernancePage } from '@pages/governance/GovernancePage';
import { PolicyTemplateDetailsPage } from '@pages/governance/PolicyTemplateDetailsPage';

type GovernanceFixtures = {
  oc: OcCliService;
  policyService: PolicyService;
  governancePage: GovernancePage;
  policyTemplateDetailsPage: PolicyTemplateDetailsPage;
};

export const test = base.extend<GovernanceFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  policyService: async ({ oc }, use) => {
    await use(new PolicyService(oc));
  },

  governancePage: async ({ page, oc }, use) => {
    await use(new GovernancePage(page, oc));
  },

  policyTemplateDetailsPage: async ({ page }, use) => {
    await use(new PolicyTemplateDetailsPage(page));
  },
});

export { expect };
