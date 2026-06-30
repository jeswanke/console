import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { GovernancePage } from '@pages/governance/GovernancePage';
import { PolicyDetailsPage } from '@pages/governance/PolicyDetailsPage';
import { PolicySetDetailsPage } from '@pages/governance/PolicySetDetailsPage';
import { PlacementDetailsPage } from '@pages/governance/PlacementDetailsPage';
import { DiscoveredPolicyDetailsPage } from '@pages/governance/DiscoveredPolicyDetailsPage';
import { PolicyTemplateDetailsPage } from '@pages/governance/PolicyTemplateDetailsPage';
import { GovernanceTable } from '@components/governance/GovernanceTable';
import { ManageColumnsDialog } from '@components/patternfly/ManageColumnsDialog';

type GovernanceFixtures = {
  oc: OcCliService;
  governancePage: GovernancePage;
  governanceTable: GovernanceTable;
  manageColumnsDialog: ManageColumnsDialog;
  policyDetailsPage: PolicyDetailsPage;
  policySetDetailsPage: PolicySetDetailsPage;
  placementDetailsPage: PlacementDetailsPage;
  discoveredPolicyDetailsPage: DiscoveredPolicyDetailsPage;
  policyTemplateDetailsPage: PolicyTemplateDetailsPage;
};

export const test = base.extend<GovernanceFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  governancePage: async ({ page, oc }, use) => {
    await use(new GovernancePage(page, oc));
  },

  governanceTable: async ({ page }, use) => {
    await use(new GovernanceTable(page));
  },

  manageColumnsDialog: async ({ page }, use) => {
    await use(new ManageColumnsDialog(page));
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

  policyTemplateDetailsPage: async ({ page }, use) => {
    await use(new PolicyTemplateDetailsPage(page));
  },
});

export { expect };
