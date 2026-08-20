import { expect } from '@playwright/test';
import { test as base } from '@fixtures/cdp-base';
import { OcCliService } from '@services/OcCliService';
import { GovernancePage } from '@pages/governance/GovernancePage';
import { PoliciesListPage } from '@pages/governance/PoliciesListPage';
import { PolicyDetailsPage } from '@pages/governance/PolicyDetailsPage';
import { PolicySetDetailsPage } from '@pages/governance/PolicySetDetailsPage';
import { PlacementDetailsPage } from '@pages/governance/PlacementDetailsPage';
import { DiscoveredPolicyDetailsPage } from '@pages/governance/DiscoveredPolicyDetailsPage';
import { PolicyTemplateDetailsPage } from '@pages/governance/PolicyTemplateDetailsPage';
import { CreatePolicyWizardPage } from '@pages/governance/CreatePolicyWizardPage';
import { GovernanceTable } from '@components/governance/GovernanceTable';
import { ManageColumnsDialog } from '@components/patternfly/ManageColumnsDialog';

type GovernanceWorkerFixtures = {
  oc: OcCliService;
};

type GovernanceFixtures = {
  governancePage: GovernancePage;
  policiesListPage: PoliciesListPage;
  governanceTable: GovernanceTable;
  manageColumnsDialog: ManageColumnsDialog;
  createPolicyWizardPage: CreatePolicyWizardPage;
  policyDetailsPage: PolicyDetailsPage;
  policySetDetailsPage: PolicySetDetailsPage;
  placementDetailsPage: PlacementDetailsPage;
  discoveredPolicyDetailsPage: DiscoveredPolicyDetailsPage;
  policyTemplateDetailsPage: PolicyTemplateDetailsPage;
};

export const test = base.extend<GovernanceFixtures, GovernanceWorkerFixtures>({
  oc: [
    async ({}, use) => {
      await use(new OcCliService());
    },
    { scope: 'worker' },
  ],

  governancePage: async ({ page, oc }, use) => {
    await use(new GovernancePage(page, oc));
  },

  policiesListPage: async ({ page, oc }, use) => {
    await use(new PoliciesListPage(page, oc));
  },

  governanceTable: async ({ page }, use) => {
    await use(new GovernanceTable(page));
  },

  manageColumnsDialog: async ({ page }, use) => {
    await use(new ManageColumnsDialog(page));
  },

  createPolicyWizardPage: async ({ page, oc }, use) => {
    await use(new CreatePolicyWizardPage(page, oc));
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
