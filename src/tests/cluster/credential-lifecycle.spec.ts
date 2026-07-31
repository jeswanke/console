/**
 * Credential lifecycle — create via CLI, verify in UI, delete via CLI, verify gone.
 *
 * Data-driven from create.yaml scenarios. Each provider's credential is tested
 * independently. Filter providers at runtime:
 *   CLC_PROVIDERS=aws,gcp,azure npx playwright test --project=cluster -g "Credential"
 */
import { test, expect } from '@fixtures/acm-test';
import { resolveEnabledClusterCreateScenarios } from '@config';
import { setupCredential, deleteCredential } from '@lib/cluster/credential-setup';

const CREDENTIAL_POLARION_IDS: Record<string, string> = {
  aws: 'RHACM4K-567',
  gcp: 'RHACM4K-569',
  azure: 'RHACM4K-568',
  azgov: 'RHACM4K-8106',
  vmware: 'RHACM4K-1232',
  openstack: 'RHACM4K-3177',
  kubevirt: 'RHACM4K-43770',
};

const allScenarios = resolveEnabledClusterCreateScenarios();

const providerFilter = process.env.CLC_PROVIDERS
  ?.split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);

const scenarios = providerFilter
  ? allScenarios.filter((s) => providerFilter.includes(s.cluster.provider))
  : allScenarios;

const uniqueProviders = [...new Map(scenarios.map((s) => [s.cluster.provider, s])).values()];

test.describe('Credential Lifecycle', { tag: ['@cluster', '@clc', '@credential'] }, () => {
  for (const scenario of uniqueProviders) {
    const provider = scenario.cluster.provider;
    const cred = scenario.credential;

    const testId = CREDENTIAL_POLARION_IDS[provider] ?? '';

    test(
      `${testId}: Create and delete ${provider.toUpperCase()} credential`,
      { tag: [...(testId ? [`@${testId}`] : []), `@${provider}`] },
      async ({ oc, credentialsListPage, clcConfig }) => {
        await test.step(`Create ${provider} credential via CLI`, async () => {
          await setupCredential(oc, provider, cred, clcConfig);
        });

        await test.step('Verify credential exists via oc', async () => {
          const result = await oc.run(
            `oc get secret ${cred.name} -n ${cred.namespace} -o name`,
          );
          expect(result.trim()).toBe(`secret/${cred.name}`);
        });

        await test.step('Verify credential visible in UI', async () => {
          await credentialsListPage.goto();
          await credentialsListPage.assertCredentialExists(cred.name);
        });

        await test.step(`Delete ${provider} credential via CLI`, async () => {
          await deleteCredential(oc, cred);
        });

        await test.step('Verify credential removed from UI', async () => {
          await credentialsListPage.goto();
          await credentialsListPage.assertCredentialNotExists(cred.name);
        });
      },
    );
  }
});
