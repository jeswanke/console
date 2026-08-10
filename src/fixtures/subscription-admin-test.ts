import { test as rbacBase, expect } from '@fixtures/rbac-test';
import { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';

type SubscriptionAdminFixtures = {
  applicationDetailsPage: ApplicationDetailsPage;
};

/** ALC subscription-admin tests — browser session uses `.auth/alc-rbac-cluster-manager-admin.json`. */
export const test = rbacBase.extend<SubscriptionAdminFixtures>({
  applicationDetailsPage: async ({ page, oc }, use) => {
    await use(new ApplicationDetailsPage(page, oc));
  },
});

export { expect };
