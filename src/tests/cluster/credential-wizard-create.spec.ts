/**
 * Credential wizard create — create credentials via UI wizard per provider.
 *
 * Data-driven from ClcConfig. Each provider with env vars configured becomes
 * an independent test. Credentials are created via the UI wizard, verified
 * in the credentials list and via `oc get secret`, then cleaned up via CLI.
 *
 * Filter providers at runtime:
 *   CLC_PROVIDERS=aws,gcp npx playwright test --project=cluster -g "Credential Wizard"
 *
 * Ported from clc-ui-e2e/cypress/tests/credentials/addCredentials.spec.js
 */
import { test, expect } from '@fixtures/acm-test';
import { fillCredentialWizard } from '@lib/cluster/credential-wizard';
import { deleteCredential } from '@lib/cluster/credential-setup';
import type { ClcProvider } from '@config';

const CREDENTIAL_POLARION_IDS: Record<string, string> = {
  aws: 'RHACM4K-567',
  gcp: 'RHACM4K-569',
  azure: 'RHACM4K-568',
  azgov: 'RHACM4K-8106',
  vmware: 'RHACM4K-1232',
  openstack: 'RHACM4K-3177',
  kubevirt: 'RHACM4K-43770',
};

const ALL_PROVIDERS: ClcProvider[] = [
  'aws',
  'gcp',
  'azure',
  'azgov',
  'vmware',
  'openstack',
  'kubevirt',
];

const providerFilter = process.env.CLC_PROVIDERS?.split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);

const providers = providerFilter
  ? ALL_PROVIDERS.filter((p) => providerFilter.includes(p))
  : ALL_PROVIDERS;

test.describe('Credential Wizard Create', { tag: ['@cluster', '@clc', '@credential'] }, () => {
  for (const provider of providers) {
    const testId = CREDENTIAL_POLARION_IDS[provider] ?? '';

    test(
      `${testId}: Create ${provider.toUpperCase()} credential via wizard`,
      { tag: [...(testId ? [`@${testId}`] : []), `@${provider}`] },
      async ({ oc, uniqueName, clcConfig, credentialsListPage, credentialWizardPage }) => {
        const providerConfig = provider === 'azgov' ? clcConfig.azgov : clcConfig[provider];
        test.skip(!providerConfig, `${provider} env vars not configured — skipping`);

        const credName = `e2e-${provider}-${uniqueName}`;
        const credNamespace = `e2e-cred-${uniqueName}`;

        await test.step('Ensure namespace exists', async () => {
          await oc.run(
            `oc create namespace ${credNamespace} --dry-run=client -o yaml | oc apply -f -`
          );
        });

        await test.step('Create credential via wizard', async () => {
          await credentialsListPage.goto();
          await fillCredentialWizard(credentialsListPage, credentialWizardPage, {
            provider,
            name: credName,
            namespace: credNamespace,
            config: clcConfig,
          });
        });

        await test.step('Verify credential in list', async () => {
          await credentialsListPage.goto();
          await credentialsListPage.assertCredentialExists(credName);
        });

        await test.step('Verify credential secret via CLI', async () => {
          const result = await oc.run(`oc get secret ${credName} -n ${credNamespace} -o name`);
          expect(result.trim()).toBe(`secret/${credName}`);
        });

        await test.step('Cleanup credential', async () => {
          await deleteCredential(oc, { name: credName, namespace: credNamespace, provider });
          await oc.run(`oc delete namespace ${credNamespace} --ignore-not-found`);
        });
      }
    );
  }
});
