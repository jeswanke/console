/* Copyright Contributors to the Open Cluster Management project */

import * as path from 'path';
import { test, expect } from '@fixtures/governance-test';
import { openshiftLogin } from '@lib/openshift-login';
import {
  applyYamlTemplate,
  deleteYamlTemplate,
  type SubstitutionRules,
} from '@lib/governance/yaml-template-utils';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const APP_TEMPLATE = path.join(TEMPLATES_DIR, 'gitops-application.yaml');
const CLEANUP_TEMPLATE = path.join(TEMPLATES_DIR, 'gitops-cleanup-policy.yaml');

const GRC_IDP = 'grc-e2e-htpasswd';
const GRC_USER = 'e2e-cluster-admin-cluster';
const APP_NAME = 'rhacm4k-31979';
const BRANCH = 'rhacm4k-6957';
const GIT_URL = 'https://github.com/stolostron/grc-e2e-policy-generator-test.git';
const GIT_PATH = 'stable/grc-e2e-managed-policy-set';
const EXPECTED_POLICY = 'e2e-grc-policy-app';

test.describe('Verify policy details page to show that the policy from GitOps is managed externally', () => {
  let consoleUrl: string;
  const uniqueId = `${Date.now()}`;

  const appSubs: SubstitutionRules = {
    applicationname: APP_NAME,
    url: GIT_URL,
    branch: BRANCH,
    path: GIT_PATH,
  };

  const cleanupSubs: SubstitutionRules = {
    id: uniqueId,
    testcase: '31979',
  };

  test.beforeAll(async ({ oc }) => {
    consoleUrl = await oc.getConsoleUrl();
  });

  test.afterAll(async ({ oc }) => {
    await deleteYamlTemplate(oc, APP_TEMPLATE, appSubs).catch(() => {});

    await oc.run(`oc delete application ${APP_NAME} -n default --ignore-not-found`).catch(() => {});
    await oc
      .run(`oc delete subscription ${APP_NAME}-subscription-1 -n default --ignore-not-found`)
      .catch(() => {});
    await oc
      .run(`oc delete placement ${APP_NAME}-placement-1 -n default --ignore-not-found`)
      .catch(() => {});

    await applyYamlTemplate(oc, CLEANUP_TEMPLATE, cleanupSubs);
    const pollInterval = 10_000;
    const start = Date.now();
    while (Date.now() - start < 120_000) {
      const ns = await oc
        .run(
          'oc get namespace ggithubcom-stolostron-grc-e2e-policy-generator-tes-ns --no-headers 2>/dev/null || true'
        )
        .catch(() => '');
      if (!ns || ns.trim() === '') break;
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    await deleteYamlTemplate(oc, CLEANUP_TEMPLATE, cleanupSubs).catch(() => {});
  });

  test('RHACM4K-31979: GRC: Test Policy Generator support to deploy Policy Set Sample from Git', async ({
    browser,
    oc,
  }) => {
    const password = process.env.GRC_RBAC_PASS;
    test.skip(!password, 'GRC_RBAC_PASS not set — skipping GitOps test');

    await applyYamlTemplate(oc, APP_TEMPLATE, appSubs);

    const pollInterval = 10_000;
    let subscriptionReady = false;
    const start = Date.now();
    while (Date.now() - start < 300_000) {
      try {
        const subStatus = await oc.run(
          `oc get subscription.apps.open-cluster-management.io ${APP_NAME}-subscription-1 -n default -o jsonpath='{.status.phase}'`
        );
        if (subStatus.replace(/'/g, '') === 'Subscribed') {
          subscriptionReady = true;
          break;
        }
      } catch {
        // Subscription may not exist yet
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    expect(subscriptionReady).toBeTruthy();

    let policyFound = false;
    const policyStart = Date.now();
    while (Date.now() - policyStart < 300_000) {
      try {
        const result = await oc.run(
          `oc get policies.policy.open-cluster-management.io ${EXPECTED_POLICY} -n default --no-headers 2>/dev/null || true`
        );
        if (result && result.trim() !== '') {
          policyFound = true;
          break;
        }
      } catch {
        // Policy may not exist yet
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    expect(policyFound).toBeTruthy();

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    try {
      await openshiftLogin(page, {
        consoleUrl,
        username: GRC_USER,
        password: password!,
        idp: GRC_IDP,
      });

      await page.goto(
        `${consoleUrl}/multicloud/governance/policies/details/default/${EXPECTED_POLICY}`,
        { waitUntil: 'domcontentloaded' }
      );

      await expect(
        page.getByRole('heading', { name: EXPECTED_POLICY }).or(page.getByText(EXPECTED_POLICY))
      ).toBeVisible({ timeout: 60_000 });

      const pageContent = page.locator('body');
      await expect(
        pageContent.getByText('Managed externally').or(pageContent.getByText('Git'))
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await context.close();
    }
  });
});
