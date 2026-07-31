/**
 * Credential delete — delete credentials via UI (kebab menu and bulk action).
 *
 * Credentials are created via CLI (hybrid approach), then deleted via UI.
 * Two tests: one kebab delete, one bulk delete. The delete flow is
 * provider-agnostic (same confirmation modal), so we use the first
 * configured provider rather than repeating per-provider.
 *
 * Ported from clc-ui-e2e/cypress/tests/credentials/deleteCredentials.spec.js
 * Consolidated: Cypress had 9 per-provider tests; delete UI is identical
 * regardless of provider type, so one test per deletion method suffices.
 */
import { test, expect } from '@fixtures/acm-test';
import { setupCredential, deleteCredential } from '@lib/cluster/credential-setup';
import type { ClcProvider, ClcConfig } from '@config';

const ALL_PROVIDERS: ClcProvider[] = ['aws', 'gcp', 'azure', 'vmware', 'openstack', 'kubevirt'];

function firstConfiguredProvider(config: ClcConfig): ClcProvider | undefined {
  return ALL_PROVIDERS.find((p) => config[p]);
}

test.describe(
  'Credential Delete',
  { tag: ['@cluster', '@clc', '@credential', '@RHACM4K-7901'] },
  () => {
    test(
      'RHACM4K-7901: Delete credential via kebab menu',
      { tag: ['@RHACM4K-7901'] },
      async ({ oc, uniqueName, clcConfig, credentialsListPage }) => {
        const provider = firstConfiguredProvider(clcConfig);
        test.skip(!provider, 'No provider env vars configured — skipping');

        const credName = `e2e-del-kebab-${uniqueName}`;
        const credNamespace = `e2e-del-kebab-${uniqueName}`;

        await test.step('Setup credential via CLI', async () => {
          await setupCredential(
            oc,
            provider!,
            { name: credName, namespace: credNamespace, provider: provider! },
            clcConfig
          );
        });

        await test.step('Verify credential visible in UI', async () => {
          await credentialsListPage.goto();
          await credentialsListPage.assertCredentialExists(credName);
        });

        await test.step('Delete via kebab menu', async () => {
          await credentialsListPage.deleteCredentialByKebab(credName);
        });

        await test.step('Verify credential removed from UI', async () => {
          await credentialsListPage.assertCredentialNotExists(credName);
        });

        await test.step('Verify credential removed via CLI', async () => {
          const result = await oc.run(
            `oc get secret ${credName} -n ${credNamespace} -o name 2>&1 || true`
          );
          expect(result).toContain('not found');
        });

        await test.step('Cleanup namespace', async () => {
          await oc.run(`oc delete namespace ${credNamespace} --ignore-not-found`);
        });
      }
    );

    test(
      'RHACM4K-7902: Delete credential via bulk action',
      { tag: ['@RHACM4K-7902'] },
      async ({ oc, uniqueName, clcConfig, credentialsListPage }) => {
        const provider = firstConfiguredProvider(clcConfig);
        test.skip(!provider, 'No provider env vars configured — skipping');

        const credName = `e2e-del-bulk-${uniqueName}`;
        const credNamespace = `e2e-del-bulk-${uniqueName}`;

        await test.step('Setup credential via CLI', async () => {
          await setupCredential(
            oc,
            provider!,
            { name: credName, namespace: credNamespace, provider: provider! },
            clcConfig
          );
        });

        await test.step('Verify credential visible in UI', async () => {
          await credentialsListPage.goto();
          await credentialsListPage.assertCredentialExists(credName);
        });

        await test.step('Delete via bulk action', async () => {
          await credentialsListPage.deleteCredentialsByBulk([credName]);
        });

        await test.step('Verify credential removed from UI', async () => {
          await credentialsListPage.assertCredentialNotExists(credName);
        });

        await test.step('Cleanup namespace', async () => {
          await oc.run(`oc delete namespace ${credNamespace} --ignore-not-found`);
        });
      }
    );
  }
);
