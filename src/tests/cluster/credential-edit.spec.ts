/**
 * Credential edit — verify edit wizard saves changes per provider.
 *
 * Credentials are created via CLI (hybrid approach), then edited via UI.
 * Each provider has different wizard fields, so each gets its own test.
 *
 * Filter providers at runtime:
 *   CLC_PROVIDERS=aws,gcp npx playwright test --project=cluster -g "Credential Edit"
 *
 * Ported from clc-ui-e2e/cypress/tests/credentials/editCredentials.spec.js
 */
import { test, expect } from '@fixtures/acm-test';
import { setupCredential, deleteCredential } from '@lib/cluster/credential-setup';
import { CREDENTIAL_WIZARD_FIELDS } from '@constants/credential-wizard';
import type { ClcProvider } from '@config';

interface EditScenario {
  provider: ClcProvider;
  testId: string;
  fieldSelector: string;
  editValue: string;
  secretKey: string;
}

const EDIT_SCENARIOS: EditScenario[] = [
  {
    provider: 'aws',
    testId: 'RHACM4K-3340',
    fieldSelector: CREDENTIAL_WIZARD_FIELDS.awsAccessKeyId,
    editValue: 'EDITED_ACCESS_KEY_ID',
    secretKey: 'aws_access_key_id',
  },
  {
    provider: 'gcp',
    testId: 'RHACM4K-3341',
    fieldSelector: CREDENTIAL_WIZARD_FIELDS.gcpProjectId,
    editValue: 'edited-gcp-project',
    secretKey: 'projectID',
  },
  {
    provider: 'azure',
    testId: 'RHACM4K-3464',
    fieldSelector: CREDENTIAL_WIZARD_FIELDS.azureClientId,
    editValue: 'edited-client-id',
    secretKey: 'osServicePrincipal\\.json',
  },
  {
    provider: 'vmware',
    testId: 'RHACM4K-3465',
    fieldSelector: CREDENTIAL_WIZARD_FIELDS.vmwareUsername,
    editValue: 'edited-vcenter-user',
    secretKey: 'username',
  },
  {
    provider: 'openstack',
    testId: 'RHACM4K-3466',
    fieldSelector: CREDENTIAL_WIZARD_FIELDS.openstackCloudName,
    editValue: 'edited-cloud',
    secretKey: 'cloud',
  },
];

const providerFilter = process.env.CLC_PROVIDERS?.split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);

const scenarios = providerFilter
  ? EDIT_SCENARIOS.filter((s) => providerFilter.includes(s.provider))
  : EDIT_SCENARIOS;

test.describe('Credential Edit', { tag: ['@cluster', '@clc', '@credential'] }, () => {
  for (const scenario of scenarios) {
    test(
      `${scenario.testId}: Edit ${scenario.provider.toUpperCase()} credential`,
      { tag: [`@${scenario.testId}`, `@${scenario.provider}`] },
      async ({ page, oc, uniqueName, clcConfig, credentialsListPage }) => {
        const providerConfig = clcConfig[scenario.provider];
        test.skip(!providerConfig, `${scenario.provider} env vars not configured — skipping`);

        const credName = `e2e-edit-${scenario.provider}-${uniqueName}`;
        const credNamespace = `e2e-edit-${uniqueName}`;

        await test.step('Setup credential via CLI', async () => {
          await setupCredential(
            oc,
            scenario.provider,
            { name: credName, namespace: credNamespace, provider: scenario.provider },
            clcConfig
          );
        });

        await test.step('Open edit wizard from list', async () => {
          await credentialsListPage.goto();
          await credentialsListPage.openEditCredential(credName);
        });

        await test.step('Edit field and save', async () => {
          const field = page.locator(scenario.fieldSelector);
          await field.clear();
          await field.fill(scenario.editValue);
          await page.getByRole('button', { name: 'Save', exact: true }).click();
        });

        await test.step('Verify edit persisted via CLI', async () => {
          const b64 = await oc.run(
            `oc get secret ${credName} -n ${credNamespace} -o jsonpath='{.data.${scenario.secretKey}}'`
          );
          const decoded = Buffer.from(b64.replace(/'/g, ''), 'base64').toString('utf-8');
          expect(decoded).toContain(scenario.editValue);
        });

        await test.step('Cleanup', async () => {
          await deleteCredential(oc, {
            name: credName,
            namespace: credNamespace,
            provider: scenario.provider,
          });
          await oc.run(`oc delete namespace ${credNamespace} --ignore-not-found`);
        });
      }
    );
  }
});
