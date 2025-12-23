import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { KubeHelper } from '@utils/kube-helper';
import { ClusterListPage } from '@pages/ClusterListPage';
import { AuthService } from '@services/AuthService';

export const test = base.extend<{
  oc: OcCliService;
  auth: AuthService;
  uniqueName: string;
  clusterListPage: ClusterListPage;
}>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },
  auth: async ({ oc }, use) => {
    await use(new AuthService(oc));
  },
  uniqueName: async ({}, use) => {
    await use(KubeHelper.generateSafeName('ci'));
  },
  clusterListPage: async ({ page, auth }, use) => {
    // Automatically log in before using the page
    await auth.login(page);
    await use(new ClusterListPage(page));
  },
});

export { expect };

