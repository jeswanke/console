import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { ClusterListPage } from '@pages/cluster/ClusterListPage';
import { generateSafeName } from '@utils/kube-helper';

type AcmFixtures = {
  oc: OcCliService;
  uniqueName: string;
  clusterListPage: ClusterListPage;
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
});

export { expect };
