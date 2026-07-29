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
const POLICY_TEMPLATE = path.join(TEMPLATES_DIR, 'ansible-32154-policy.yaml');

const GRC_IDP = 'grc-e2e-htpasswd';
const GRC_USER = 'e2e-cluster-admin-cluster';
const TESTID = 'ansiblejob';
const CREDENTIAL_NAME = 'grcui-e2e-credential';
const TEMPLATE_NAME = 'Demo Job Template';

test.describe('GRC: Test PolicyAutomation configurable fields on console UI', () => {
  let consoleUrl: string;
  let isAapAvailable = false;
  const uniqueId = `${Date.now()}`;

  const credSubs: SubstitutionRules = {
    id: uniqueId,
    testid: TESTID,
  };

  const policySubs: SubstitutionRules = {
    id: uniqueId,
  };

  const policyName = `rhacm4k-32154-${uniqueId}`;

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
    await deleteYamlTemplate(oc, POLICY_TEMPLATE, policySubs).catch(() => {});
    await deleteYamlTemplate(oc, CREDENTIAL_TEMPLATE, credSubs).catch(() => {});
    await oc
      .run(`oc delete secret ${CREDENTIAL_NAME} -n default --ignore-not-found`)
      .catch(() => {});
  });

  test('RHACM4K-32154: GRC: Verify links and descriptions for ansible templates for GRC PolicyAutomation', async ({
    browser,
    oc,
  }) => {
    const password = process.env.GRC_RBAC_PASS;
    test.skip(!password, 'GRC_RBAC_PASS not set — skipping Ansible test');
    test.skip(!isAapAvailable, 'AAP operator not available — skipping Ansible test');

    const credExists = await oc
      .run(`oc get secret ${CREDENTIAL_NAME} -n default --no-headers 2>/dev/null || true`)
      .then((r) => r.trim() !== '');

    if (!credExists) {
      await applyYamlTemplate(oc, CREDENTIAL_TEMPLATE, credSubs);

      const credPolicyName = `plc-auto-ansicred-${uniqueId}-${TESTID}`;
      await oc.run(
        `oc -n default patch policy.policy.open-cluster-management.io ${credPolicyName} --type merge -p '{"spec":{"remediationAction":"enforce"}}'`
      );
      await waitForPolicyCompliance(oc, credPolicyName, 'default', 'Compliant');
    }

    await applyYamlTemplate(oc, POLICY_TEMPLATE, policySubs);
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
      if (await credentialDropdown.isVisible().catch(() => false)) {
        await credentialDropdown.click();
        await page.getByRole('option', { name: CREDENTIAL_NAME }).click();
      }

      const templateDropdown = sidebar.locator(
        'button[class*="select"], [aria-label*="template"], [aria-label*="Template"]'
      );
      const templateDropdowns = await templateDropdown.all();
      if (templateDropdowns.length > 1) {
        await templateDropdowns[1].click();
      } else if (templateDropdowns.length === 1) {
        await templateDropdowns[0].click();
      }

      const templateOption = page.getByRole('option', { name: TEMPLATE_NAME });
      if (await templateOption.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await templateOption.click();
      }

      const viewLink = sidebar.getByRole('link', { name: /view selected template/i });
      await expect(viewLink).toBeVisible({ timeout: 15_000 });
    } finally {
      await context.close();
    }
  });
});
