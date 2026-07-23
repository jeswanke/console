/* Copyright Contributors to the Open Cluster Management project */

import * as path from 'path';
import { test } from '@fixtures/governance-test';
import { openshiftLogin } from '@lib/openshift-login';
import {
  applyYamlTemplate,
  deleteYamlTemplate,
  type SubstitutionRules,
} from '@lib/governance/yaml-template-utils';
import {
  waitForPolicyStatusCLI,
  waitForPolicyPropagation,
  actionPolicyFromCLI,
} from '@lib/governance/policy-lifecycle';
import {
  verifyPolicyListingPermissions,
  verifyPolicyDetailsPermissions,
  verifyPolicyResultsPage,
  verifyPolicyCreatePage,
  type RbacPermissions,
  type RbacUserConfig,
} from '@lib/governance/rbac-verification';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const POD_POLICY = path.join(TEMPLATES_DIR, 'rbac-pod-governance.yaml');
const NS_POLICY = path.join(TEMPLATES_DIR, 'rbac-namespace-governance.yaml');
const CRED_CREATE = path.join(TEMPLATES_DIR, 'rbac-credential-create.yaml');
const CRED_CLEANUP = path.join(TEMPLATES_DIR, 'rbac-credential-cleanup.yaml');

const GRC_IDP = 'grc-e2e-htpasswd';
const TESTID = 'rbacui';

const PERMISSIONS: Record<string, RbacPermissions> = {
  clusterManagerAdmin: { get: true, patch: true, create: true, delete: true },
  clusterAdmin: { get: true, patch: true, create: true, delete: true },
  admin: { get: true, patch: true, create: true, delete: true },
  edit: { get: true, patch: true, create: false, delete: false },
  view: { get: true, patch: false, create: false, delete: false },
};

test.describe(
  'GRC: Verify RBAC in GRC policies UI',
  { tag: ['@rbac', '@zstream', '@uitest', '@ansible'] },
  () => {
    const testId = `pw-${Date.now().toString(36)}`;
    const substitutionRules: SubstitutionRules = { id: testId, testid: TESTID };

    const policyName1 = `test-${testId}-${TESTID}-e2e-rbac-test-1`;
    const policyName2 = `test-${testId}-${TESTID}-e2e-rbac-test-2`;
    const allPolicyNames = [policyName1, policyName2];
    const ns1PolicyNames = [policyName1];
    const allNamespaces = ['e2e-rbac-test-1', 'e2e-rbac-test-2'];
    const ns1Namespaces = ['e2e-rbac-test-1'];
    const policySearchFilter = `${testId}-${TESTID}-e2e-rbac`;

    let consoleUrl: string;
    let rbacPass: string;

    test.beforeAll(async ({ oc }) => {
      test.setTimeout(600_000);

      rbacPass = process.env.GRC_RBAC_PASS || '';
      if (!rbacPass) {
        test.skip();
        return;
      }

      consoleUrl = await oc.getConsoleUrl();

      await oc
        .run(
          'oc adm managedclusterset add-cluster-set-binding global --namespace e2e-rbac-test-1 2>/dev/null || true'
        )
        .catch(() => {});

      await applyYamlTemplate(oc, POD_POLICY, substitutionRules);
      await applyYamlTemplate(oc, NS_POLICY, substitutionRules);

      await waitForPolicyPropagation(oc, policyName1, 'e2e-rbac-test-1');
      await waitForPolicyPropagation(oc, policyName2, 'e2e-rbac-test-2');

      const hasAap = await oc
        .run('oc get deployment aap-operator -n openshift-operators -o name 2>/dev/null')
        .then((r) => r.includes('deployment'))
        .catch(() => false);

      if (hasAap) {
        const credPolicyName = `plc-rbac-ansicred-${testId}-${TESTID}`;
        await applyYamlTemplate(oc, CRED_CREATE, substitutionRules);
        await waitForPolicyStatusCLI(oc, credPolicyName, false, 1);
        await actionPolicyFromCLI(oc, credPolicyName, 'Enforce');
        await waitForPolicyStatusCLI(oc, credPolicyName, true, 1);
        await deleteYamlTemplate(oc, CRED_CREATE, substitutionRules);
      }
    });

    async function runRbacTest(
      browser: import('@playwright/test').Browser,
      userConfig: RbacUserConfig
    ): Promise<void> {
      const ctx = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 1920, height: 1080 },
      });
      const page = await ctx.newPage();

      try {
        await openshiftLogin(page, {
          consoleUrl,
          username: userConfig.username,
          password: rbacPass,
          idp: GRC_IDP,
        });

        await verifyPolicyListingPermissions(page, consoleUrl, userConfig);

        if (userConfig.expectedPolicyCount > 0) {
          const detailPolicyName = userConfig.namespaced ? ns1PolicyNames[0] : allPolicyNames[0];
          const detailNamespace = 'e2e-rbac-test-1';
          await verifyPolicyDetailsPermissions(
            page,
            consoleUrl,
            detailPolicyName,
            detailNamespace,
            userConfig.permissions
          );

          await verifyPolicyResultsPage(page, consoleUrl, detailPolicyName, detailNamespace);
        }

        await verifyPolicyCreatePage(
          page,
          consoleUrl,
          userConfig.permissions,
          userConfig.expectedNamespaces
        );
      } finally {
        await ctx.close();
      }
    }

    test(
      'RHACM4K-41809 GRC: Verify policies as e2e-admin-cluster',
      { tag: ['@41809'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-admin-cluster',
          permissions: PERMISSIONS.admin,
          expectedPolicyCount: allPolicyNames.length,
          namespaced: false,
          searchFilter: policySearchFilter,
          expectedNamespaces: allNamespaces,
        });
      }
    );

    test(
      'RHACM4K-956: GRC: As an user with namespace-role-binding of default admin role to check policy',
      { tag: ['@956'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-admin-ns',
          permissions: PERMISSIONS.admin,
          expectedPolicyCount: ns1PolicyNames.length,
          namespaced: true,
          searchFilter: `${policySearchFilter}-test-1`,
          expectedNamespaces: ns1Namespaces,
        });
      }
    );

    test(
      'RHACM4K-41813: GRC: Verify policies as e2e-cluster-admin-ns',
      { tag: ['@41813'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-cluster-admin-ns',
          permissions: PERMISSIONS.clusterAdmin,
          expectedPolicyCount: ns1PolicyNames.length,
          namespaced: true,
          searchFilter: policySearchFilter,
          expectedNamespaces: ns1Namespaces,
        });
      }
    );

    test(
      'RHACM4K-734: GRC: As an user with cluster-wide-role-binding of open-cluster-management:cluster-manager-admin role to check policy',
      { tag: ['@734'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-cmgr-admin-cluster',
          permissions: PERMISSIONS.clusterManagerAdmin,
          expectedPolicyCount: allPolicyNames.length,
          namespaced: false,
          searchFilter: policySearchFilter,
          expectedNamespaces: allNamespaces,
        });
      }
    );

    test(
      'RHACM4K-41810 GRC: RBAC: Verify policies as e2e-edit-cluster',
      { tag: ['@41810'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-edit-cluster',
          permissions: PERMISSIONS.edit,
          expectedPolicyCount: allPolicyNames.length,
          namespaced: false,
          searchFilter: policySearchFilter,
          expectedNamespaces: allNamespaces,
        });
      }
    );

    test(
      'RHACM4K-958: GRC: As an user with namespace-role-binding of default edit role to check policy',
      { tag: ['@958'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-edit-ns',
          permissions: PERMISSIONS.edit,
          expectedPolicyCount: ns1PolicyNames.length,
          namespaced: true,
          searchFilter: policySearchFilter,
          expectedNamespaces: ns1Namespaces,
        });
      }
    );

    test(
      'RHACM4K-41812 GRC: Verify policies as e2e-group-cluster',
      { tag: ['@41812'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-group-cluster',
          permissions: PERMISSIONS.view,
          expectedPolicyCount: allPolicyNames.length,
          namespaced: false,
          searchFilter: policySearchFilter,
          expectedNamespaces: allNamespaces,
        });
      }
    );

    test(
      'RHACM4K-41811 GRC: Verify policies as e2e-view-cluster',
      { tag: ['@41811', '@disconnected'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-view-cluster',
          permissions: PERMISSIONS.view,
          expectedPolicyCount: allPolicyNames.length,
          namespaced: false,
          searchFilter: policySearchFilter,
          expectedNamespaces: allNamespaces,
        });
      }
    );

    test(
      'RHACM4K-957: GRC: As an user with namespace-role-binding of default view role to check policy',
      { tag: ['@957'] },
      async ({ browser }) => {
        test.setTimeout(300_000);
        await runRbacTest(browser, {
          username: 'e2e-view-ns',
          permissions: PERMISSIONS.view,
          expectedPolicyCount: ns1PolicyNames.length,
          namespaced: true,
          searchFilter: policySearchFilter,
          expectedNamespaces: ns1Namespaces,
        });

        await runRbacTest(browser, {
          username: 'e2e-group-ns',
          permissions: PERMISSIONS.view,
          expectedPolicyCount: ns1PolicyNames.length,
          namespaced: true,
          searchFilter: policySearchFilter,
          expectedNamespaces: allNamespaces,
        });
      }
    );

    test.afterAll(async ({ oc }) => {
      test.setTimeout(300_000);

      await deleteYamlTemplate(oc, NS_POLICY, substitutionRules).catch(() => {});
      await deleteYamlTemplate(oc, POD_POLICY, substitutionRules).catch(() => {});

      const hasAap = await oc
        .run('oc get deployment aap-operator -n openshift-operators -o name 2>/dev/null')
        .then((r) => r.includes('deployment'))
        .catch(() => false);

      if (hasAap) {
        const cleanupPolicyName = `policy-ansible-cleanup-${testId}-${TESTID}`;
        await applyYamlTemplate(oc, CRED_CLEANUP, substitutionRules);
        await waitForPolicyStatusCLI(oc, cleanupPolicyName, false, 1).catch(() => {});
        await actionPolicyFromCLI(oc, cleanupPolicyName, 'Enforce').catch(() => {});
        await waitForPolicyStatusCLI(oc, cleanupPolicyName, true, 1).catch(() => {});
        await deleteYamlTemplate(oc, CRED_CLEANUP, substitutionRules).catch(() => {});
      }
    });
  }
);
