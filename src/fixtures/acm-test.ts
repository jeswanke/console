import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { KubeHelper } from '@utils/kube-helper';
import { ClusterListPage } from '@pages/ClusterListPage';

export const test = base.extend<{
  oc: OcCliService;
  uniqueName: string;
  clusterListPage: ClusterListPage;
}>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },
  uniqueName: async ({}, use) => {
    await use(KubeHelper.generateSafeName('ci'));
  },
  // Page is already authenticated via storageState from setup project
  clusterListPage: async ({ page }, use) => {
    await use(new ClusterListPage(page));
  },
});

export { expect };
