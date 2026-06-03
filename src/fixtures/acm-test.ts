import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { ClusterListPage } from '@pages/cluster/ClusterListPage';
import { ClusterNodesPage } from '@pages/cluster/ClusterNodesPage';
import { PlacementsListPage } from '@pages/cluster/PlacementsListPage';
import { CreatePlacementWizardPage } from '@pages/cluster/CreatePlacementWizardPage';
import { PoliciesListPage } from '@pages/governance/PoliciesListPage';
import { CreatePolicyWizardPage } from '@pages/governance/CreatePolicyWizardPage';
import { PolicySetsListPage } from '@pages/governance/PolicySetsListPage';
import { CreatePolicySetWizardPage } from '@pages/governance/CreatePolicySetWizardPage';
import { generateSafeName } from '@utils/kube-helper';

type AcmFixtures = {
  oc: OcCliService;
  uniqueName: string;
  clusterListPage: ClusterListPage;
  clusterNodesPage: ClusterNodesPage;
  placementsListPage: PlacementsListPage;
  createPlacementWizardPage: CreatePlacementWizardPage;
  policiesListPage: PoliciesListPage;
  createPolicyWizardPage: CreatePolicyWizardPage;
  policySetsListPage: PolicySetsListPage;
  createPolicySetWizardPage: CreatePolicySetWizardPage;
};

export const test = base.extend<AcmFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  uniqueName: async ({}, use) => {
    await use(generateSafeName('ci'));
  },

  clusterListPage: async ({ page, oc }, use) => {
    await use(new ClusterListPage(page, oc));
  },

  clusterNodesPage: async ({ page, oc }, use) => {
    await use(new ClusterNodesPage(page, oc));
  },

  placementsListPage: async ({ page, oc }, use) => {
    await use(new PlacementsListPage(page, oc));
  },

  createPlacementWizardPage: async ({ page, oc }, use) => {
    await use(new CreatePlacementWizardPage(page, oc));
  },

  policiesListPage: async ({ page, oc }, use) => {
    await use(new PoliciesListPage(page, oc));
  },

  createPolicyWizardPage: async ({ page, oc }, use) => {
    await use(new CreatePolicyWizardPage(page, oc));
  },

  policySetsListPage: async ({ page, oc }, use) => {
    await use(new PolicySetsListPage(page, oc));
  },

  createPolicySetWizardPage: async ({ page, oc }, use) => {
    await use(new CreatePolicySetWizardPage(page, oc));
  },
});

export { expect };
