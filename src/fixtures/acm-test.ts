import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { ClusterListPage } from '@pages/cluster/ClusterListPage';
import { ClusterNodesPage } from '@pages/cluster/ClusterNodesPage';
import { generateSafeName } from '@utils/kube-helper';

type AcmFixtures = {
  oc: OcCliService;
  uniqueName: string;
  clusterListPage: ClusterListPage;
  clusterNodesPage: ClusterNodesPage;
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
});

export { expect };
