import { test as base, expect } from '@playwright/test';
import {
  loadManagedClusterContext,
  type ManagedClusterContextFile,
} from '@lib/cluster/managedClusterContext';
import { OcCliService } from '@services/OcCliService';
import { ApplicationListPage } from '@pages/app/ApplicationListPage';
import { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';
import { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import { ArgoPullApplicationCreateWizardPage } from '@pages/app/ArgoPullApplicationCreateWizardPage';
import { PlacementDetailsPage } from '@pages/cluster/PlacementDetailsPage';

type AppFixtures = {
  oc: OcCliService;
  /** From **`.auth/managedClusters.json`** when global setup ran the generator (skipped for unit-only runs or `E2E_SKIP_MANAGED_CLUSTER_PREP`). */
  managedClusterContext: ManagedClusterContextFile | undefined;
  applicationListPage: ApplicationListPage;
  applicationDetailsPage: ApplicationDetailsPage;
  placementDetailsPage: PlacementDetailsPage;
  subscriptionApplicationCreateWizardPage: SubscriptionApplicationCreateWizardPage;
  argoPushApplicationCreateWizardPage: ArgoPushApplicationCreateWizardPage;
  argoPullApplicationCreateWizardPage: ArgoPullApplicationCreateWizardPage;
};

export const test = base.extend<AppFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  managedClusterContext: async ({}, use) => {
    await use(loadManagedClusterContext());
  },

  applicationListPage: async ({ page, oc }, use) => {
    await use(new ApplicationListPage(page, oc));
  },

  applicationDetailsPage: async ({ page, oc }, use) => {
    await use(new ApplicationDetailsPage(page, oc));
  },

  placementDetailsPage: async ({ page, oc }, use) => {
    await use(new PlacementDetailsPage(page, oc));
  },

  subscriptionApplicationCreateWizardPage: async ({ page, oc }, use) => {
    await use(new SubscriptionApplicationCreateWizardPage(page, oc));
  },

  argoPushApplicationCreateWizardPage: async ({ page, oc }, use) => {
    await use(new ArgoPushApplicationCreateWizardPage(page, oc));
  },

  argoPullApplicationCreateWizardPage: async ({ page, oc }, use) => {
    await use(new ArgoPullApplicationCreateWizardPage(page, oc));
  },
});

export { expect };
