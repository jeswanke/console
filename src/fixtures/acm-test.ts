import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { ClusterListPage } from '@pages/cluster/ClusterListPage';
import { ClusterNodesPage } from '@pages/cluster/ClusterNodesPage';
import { CreateClusterWizardPage } from '@pages/cluster/CreateClusterWizardPage';
import { CredentialsListPage } from '@pages/cluster/CredentialsListPage';
import { CredentialWizardPage } from '@pages/cluster/CredentialWizardPage';
import { ClusterOverviewPage } from '@pages/cluster/ClusterOverviewPage';
import { ClusterAddonsPage } from '@pages/cluster/ClusterAddonsPage';
import { ImportClusterWizardPage } from '@pages/cluster/ImportClusterWizardPage';
import { PlacementsListPage } from '@pages/cluster/PlacementsListPage';
import { CreatePlacementWizardPage } from '@pages/cluster/CreatePlacementWizardPage';
import { PoliciesListPage } from '@pages/governance/PoliciesListPage';
import { CreatePolicyWizardPage } from '@pages/governance/CreatePolicyWizardPage';
import { PolicySetsListPage } from '@pages/governance/PolicySetsListPage';
import { CreatePolicySetWizardPage } from '@pages/governance/CreatePolicySetWizardPage';
import { WelcomePage } from '@pages/overview/WelcomePage';
import { generateSafeName } from '@utils/kube-helper';
import { getClcConfig, type ClcConfig } from '@config';

type AcmFixtures = {
  oc: OcCliService;
  uniqueName: string;
  clcConfig: ClcConfig;
  clusterListPage: ClusterListPage;
  clusterNodesPage: ClusterNodesPage;
  clusterOverviewPage: ClusterOverviewPage;
  clusterAddonsPage: ClusterAddonsPage;
  createClusterWizardPage: CreateClusterWizardPage;
  importClusterWizardPage: ImportClusterWizardPage;
  credentialsListPage: CredentialsListPage;
  credentialWizardPage: CredentialWizardPage;
  placementsListPage: PlacementsListPage;
  createPlacementWizardPage: CreatePlacementWizardPage;
  policiesListPage: PoliciesListPage;
  createPolicyWizardPage: CreatePolicyWizardPage;
  policySetsListPage: PolicySetsListPage;
  createPolicySetWizardPage: CreatePolicySetWizardPage;
  welcomePage: WelcomePage;
};

export const test = base.extend<AcmFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  uniqueName: async ({}, use) => {
    await use(generateSafeName('ci'));
  },

  clcConfig: async ({}, use) => {
    await use(getClcConfig());
  },

  clusterListPage: async ({ page, oc }, use) => {
    await use(new ClusterListPage(page, oc));
  },

  clusterNodesPage: async ({ page, oc }, use) => {
    await use(new ClusterNodesPage(page, oc));
  },

  clusterOverviewPage: async ({ page, oc }, use) => {
    await use(new ClusterOverviewPage(page, oc));
  },

  clusterAddonsPage: async ({ page, oc }, use) => {
    await use(new ClusterAddonsPage(page, oc));
  },

  createClusterWizardPage: async ({ page, oc }, use) => {
    await use(new CreateClusterWizardPage(page, oc));
  },

  importClusterWizardPage: async ({ page, oc }, use) => {
    await use(new ImportClusterWizardPage(page, oc));
  },

  credentialsListPage: async ({ page, oc }, use) => {
    await use(new CredentialsListPage(page, oc));
  },

  credentialWizardPage: async ({ page, oc }, use) => {
    await use(new CredentialWizardPage(page, oc));
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

  welcomePage: async ({ page, oc }, use) => {
    await use(new WelcomePage(page, oc));
  },
});

export { expect };
