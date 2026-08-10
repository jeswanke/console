/**
 * RHACM4K-41355 — Subscription-admin role topology (placementrules + namespaces).
 *
 * Cypress: `Subscription_Admin_Role_Test_Suite.cy.js` (@UI test only).
 */
import { APP_SUBSCRIPTION_ADMIN_PLACEMENTRULES } from '@constants/subscription-admin';
import { ensureSubscriptionAdminPlacementrulesFixture } from '@lib/app/setup/subscription-placementrules-fixture';
import { verifySubscriptionPlacementrulesTopologyDetails } from '@lib/app/verify/subscription-placementrules-topology';
import { test } from '@fixtures/subscription-admin-test';

test.describe(
  'Application Lifecycle UI: Subscription admin Role Test Suite',
  { tag: ['@alc', '@subadmin', '@alc-rbac', '@e2e'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      'RHACM4K-41355: ALC: Verify placementrules and namespaces in the topology node details list are correctly displayed',
      {
        tag: ['@RHACM4K-41355', '@create', '@pre-restore', '@post-restore'],
      },
      async ({ oc, page, applicationDetailsPage }) => {
        test.setTimeout(600_000);
        const rbacPassword =
          process.env.RBAC_TEST_PASSWORD?.trim() || process.env.HUB_PASSWORD?.trim();
        if (!rbacPassword) {
          test.skip(
            true,
            'RBAC_TEST_PASSWORD or HUB_PASSWORD required for subscription-admin oc login'
          );
          return;
        }

        const { rbacUser } = APP_SUBSCRIPTION_ADMIN_PLACEMENTRULES;

        await ensureSubscriptionAdminPlacementrulesFixture({
          oc,
          tags: test.info().tags,
          rbacUser,
          rbacPassword,
        });

        await verifySubscriptionPlacementrulesTopologyDetails(applicationDetailsPage, page);
      }
    );
  }
);
