import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { GovernancePage } from '@pages/governance/GovernancePage';
import { PolicyDetailsPage } from '@pages/governance/PolicyDetailsPage';
import { PolicySetDetailsPage } from '@pages/governance/PolicySetDetailsPage';
import { PlacementDetailsPage } from '@pages/governance/PlacementDetailsPage';
import { DiscoveredPolicyDetailsPage } from '@pages/governance/DiscoveredPolicyDetailsPage';

type GovernanceFixtures = {
  oc: OcCliService;
  governancePage: GovernancePage;
  policyDetailsPage: PolicyDetailsPage;
  policySetDetailsPage: PolicySetDetailsPage;
  placementDetailsPage: PlacementDetailsPage;
  discoveredPolicyDetailsPage: DiscoveredPolicyDetailsPage;
};

export const test = base.extend<GovernanceFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  governancePage: async ({ page, oc }, use) => {
    await use(new GovernancePage(page, oc));
  },

  policyDetailsPage: async ({ page, oc }, use) => {
    await use(new PolicyDetailsPage(page, oc));
  },

  policySetDetailsPage: async ({ page, oc }, use) => {
    await use(new PolicySetDetailsPage(page, oc));
  },

  placementDetailsPage: async ({ page, oc }, use) => {
    await use(new PlacementDetailsPage(page, oc));
  },

  discoveredPolicyDetailsPage: async ({ page, oc }, use) => {
    await use(new DiscoveredPolicyDetailsPage(page, oc));
  },
});

export { expect };
