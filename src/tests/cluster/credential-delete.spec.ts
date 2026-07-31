/**
 * Credential delete — create via wizard, delete via UI.
 *
 * Two tests: kebab delete and bulk delete. Credentials are created via
 * the wizard (not CLI) because ACM disables kebab actions on credentials
 * that weren't created through the console.
 *
 * Ported from clc-ui-e2e/cypress/tests/credentials/deleteCredentials.spec.js
 * Consolidated: Cypress had 9 per-provider tests; delete UI is identical
 * regardless of provider type, so one test per deletion method suffices.
 */
import { test, expect } from '@fixtures/acm-test';
import { fillCredentialWizard } from '@lib/cluster/credential-wizard';
import type { ClcProvider, ClcConfig } from '@config';

const ALL_PROVIDERS: ClcProvider[] = ['aws', 'gcp', 'azure', 'vmware', 'openstack'];

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
      async ({ oc, uniqueName, clcConfig, credentialsListPage, credentialWizardPage }) => {
        const provider = firstConfiguredProvider(clcConfig);
        test.skip(!provider, 'No provider env vars configured — skipping');

        const credName = `e2e-del-kebab-${uniqueName}`;
        const credNamespace = `e2e-del-kebab-${uniqueName}`;

        await test.step('Create namespace', async () => {
          await oc.run(
            `oc create namespace ${credNamespace} --dry-run=client -o yaml | oc apply -f -`
          );
        });

        await test.step('Create credential via wizard', async () => {
          await credentialsListPage.goto();
          await fillCredentialWizard(credentialsListPage, credentialWizardPage, {
            provider: provider!,
            name: credName,
            namespace: credNamespace,
            config: clcConfig,
          });
        });

        await test.step('Verify credential in list', async () => {
          await credentialsListPage.goto();
          await credentialsListPage.assertCredentialExists(credName);
        });

        await test.step('Delete via kebab menu', async () => {
          await credentialsListPage.deleteCredentialByKebab(credName);
        });

        await test.step('Verify credential removed from UI', async () => {
          await credentialsListPage.assertCredentialNotExists(credName);
        });

        await test.step('Cleanup namespace', async () => {
          await oc.run(`oc delete namespace ${credNamespace} --ignore-not-found`);
        });
      }
    );

    test(
      'RHACM4K-7902: Delete credential via bulk action',
      { tag: ['@RHACM4K-7902'] },
      async ({ oc, uniqueName, clcConfig, credentialsListPage, credentialWizardPage }) => {
        const provider = firstConfiguredProvider(clcConfig);
        test.skip(!provider, 'No provider env vars configured — skipping');

        const credName = `e2e-del-bulk-${uniqueName}`;
        const credNamespace = `e2e-del-bulk-${uniqueName}`;

        await test.step('Create namespace', async () => {
          await oc.run(
            `oc create namespace ${credNamespace} --dry-run=client -o yaml | oc apply -f -`
          );
        });

        await test.step('Create credential via wizard', async () => {
          await credentialsListPage.goto();
          await fillCredentialWizard(credentialsListPage, credentialWizardPage, {
            provider: provider!,
            name: credName,
            namespace: credNamespace,
            config: clcConfig,
          });
        });

        await test.step('Verify credential in list', async () => {
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
