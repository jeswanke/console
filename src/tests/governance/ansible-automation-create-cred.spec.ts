/* Copyright Contributors to the Open Cluster Management project */

import * as path from 'path';
import { test, expect } from '@fixtures/governance-test';
import { openshiftLogin } from '@lib/openshift-login';
import {
  applyYamlTemplate,
  deleteYamlTemplate,
  type SubstitutionRules,
} from '@lib/governance/yaml-template-utils';
import { waitForPolicyCompliance } from '@lib/governance/policy-lifecycle';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const CREDENTIAL_TEMPLATE = path.join(TEMPLATES_DIR, 'ansible-credential-create.yaml');
const AUTOMATE_POLICY_TEMPLATE = path.join(TEMPLATES_DIR, 'ansible-policy-to-automate.yaml');

const GRC_IDP = 'grc-e2e-htpasswd';
const GRC_USER = 'e2e-cluster-admin-cluster';
const TESTID = 'createcred';
const CREDENTIAL_NAME = 'grcui-e2e-credential';

test.describe('RHACM4K-3471: GRC: Create Ansible Credential from the Policy Violation Automation Panel', () => {
  let consoleUrl: string;
  let isAapAvailable = false;
  let createdCredential = false;
  const uniqueId = `${Date.now()}`;

  const credSubs: SubstitutionRules = {
    id: uniqueId,
    testid: TESTID,
  };

  const automatePolicySubs: SubstitutionRules = {
    id: uniqueId,
  };

  const policyName = `to-automate-createcred-${uniqueId}`;

  test.beforeAll(async ({ oc }) => {
    consoleUrl = await oc.getConsoleUrl();

    try {
      const result = await oc.run('oc get deployment -n aap aap-gateway 2>/dev/null || true');
      isAapAvailable = result.trim() !== '' && !result.includes('NotFound');
    } catch {
      isAapAvailable = false;
    }
  });

  test.afterAll(async ({ oc }) => {
    await deleteYamlTemplate(oc, AUTOMATE_POLICY_TEMPLATE, automatePolicySubs).catch(() => {});
    if (createdCredential) {
      await deleteYamlTemplate(oc, CREDENTIAL_TEMPLATE, credSubs).catch(() => {});
      await oc
        .run(`oc delete secret ${CREDENTIAL_NAME} -n default --ignore-not-found`)
        .catch(() => {});
    }
  });

  test('RHACM4K-3471: GRC: Create Ansible Credential from the Policy Violation Automation Panel', async ({
    browser,
    oc,
  }) => {
    const password = process.env.GRC_RBAC_PASS;
    test.skip(!password, 'GRC_RBAC_PASS not set — skipping Ansible credential test');
    test.skip(!isAapAvailable, 'AAP operator not available — skipping Ansible credential test');

    const credExists = await oc
      .run(`oc get secret ${CREDENTIAL_NAME} -n default --no-headers 2>/dev/null || true`)
      .then((r) => r.trim() !== '');

    if (!credExists) {
      createdCredential = true;
      await applyYamlTemplate(oc, CREDENTIAL_TEMPLATE, credSubs);

      const credPolicyName = `plc-auto-ansicred-${uniqueId}-${TESTID}`;
      await oc.run(
        `oc -n default patch policy.policy.open-cluster-management.io ${credPolicyName} --type merge -p '{"spec":{"remediationAction":"enforce"}}'`
      );
      await waitForPolicyCompliance(oc, credPolicyName, 'default', 'Compliant');
    }

    await applyYamlTemplate(oc, AUTOMATE_POLICY_TEMPLATE, automatePolicySubs);
    await waitForPolicyCompliance(oc, policyName, 'default', 'NonCompliant');

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    try {
      await openshiftLogin(page, {
        consoleUrl,
        username: GRC_USER,
        password: password!,
        idp: GRC_IDP,
      });

      await page.goto(`${consoleUrl}/multicloud/governance/policies`, {
        waitUntil: 'domcontentloaded',
      });

      await page.locator('[aria-label="Search input"]').fill(policyName);
      await page.getByRole('link', { name: policyName, exact: true }).waitFor({ timeout: 30_000 });

      const row = page.getByRole('row').filter({ hasText: policyName });
      const automationCell = row.getByRole('cell').last();
      const configureButton = automationCell.getByRole('button', { name: /configure/i });

      if (await configureButton.isVisible().catch(() => false)) {
        await configureButton.click();
      } else {
        await page.getByRole('link', { name: policyName, exact: true }).click();

        await page.getByRole('tab', { name: /details/i }).click();
        await page.waitForLoadState('domcontentloaded');

        const actionsButton = page.getByRole('button', { name: /actions/i });
        await actionsButton.click();
        const configItem = page.getByRole('menuitem', { name: /configure/i });
        await expect(configItem).toBeVisible({ timeout: 15_000 });
        await configItem.click();
      }

      const sidebar = page
        .locator('[class*="sidebar"], [class*="drawer"], [role="dialog"]')
        .first();
      await expect(sidebar).toBeVisible({ timeout: 30_000 });

      const credentialDropdown = sidebar.locator(
        'button[class*="select"], [class*="credential"] select, [aria-label*="credential"], [aria-label*="Credential"]'
      );
      await expect(credentialDropdown).toBeVisible({ timeout: 15_000 });
      await credentialDropdown.click();

      const credentialOption = page.getByRole('option', { name: CREDENTIAL_NAME });
      await expect(credentialOption).toBeVisible({ timeout: 15_000 });

      const createCredButton = page
        .getByRole('button', { name: /create credential/i })
        .or(page.getByRole('link', { name: /create credential/i }));
      await expect(createCredButton).toBeVisible({ timeout: 15_000 });
    } finally {
      await context.close();
    }
  });
});
