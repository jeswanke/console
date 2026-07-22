/**
 * RHACM4K-63608: Argo CD ApplicationSet push-model wizard — private Git repository.
 *
 * Setup: GitOps prep (`E2E_GITOPS_PREP`), hub Argo CD repository Secret (`applyPrivateGitRepoSecretToArgo`),
 * and `GITHUB_USER` / `GITHUB_TOKEN` in `env/alc.local.env`.
 */
import { resolveArgoPushScenarioByTestId } from '@config';
import {
  applyPrivateGitRepoSecretToArgo,
  skipUnlessPrivateGitAuthConfigured,
} from '@lib/app/auth/private-git';
import {
  cleanupArgoPushApplication,
  createArgoPushApplication,
  verifyArgoPushPrivateRepoDetailsTab,
  verifyArgoPushPrivateRepoTopologyDeployed,
  verifyConfigureRepositoryCredentialsOpensGitOpsSettings,
  verifyPrivateRepoCredentialsAlertOnTemplate,
} from '@lib/app/argo-push';
import { expect, test } from '@fixtures/app-test';

test.describe(
  'Argo push ApplicationSet private repository',
  { tag: ['@app', '@alc', '@UI', '@argo', '@push-model', '@gitops', '@private-git'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      'RHACM4K-63608: ALC: As an application admin, I can create an application using a private repository via the AppSet wizard',
      { tag: ['@RHACM4K-63608', '@create', '@e2e-common'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        argoPushApplicationCreateWizardPage: wizard,
        page,
      }) => {
        test.setTimeout(600_000);

        const auth = skipUnlessPrivateGitAuthConfigured(test, 'RHACM4K-63608');
        if (!auth) return;

        const { argoPush: options } = resolveArgoPushScenarioByTestId('RHACM4K-63608');
        const {
          applicationName,
          argoServerLabel: argoServerNamespace,
          git,
        } = options;

        await applyPrivateGitRepoSecretToArgo(oc, auth, git!.url);
        await cleanupArgoPushApplication(oc, options);

        await applicationListPage.goto();

        await test.step('Open wizard and verify private repository credentials alert on Template', async () => {
          await wizard.openFromApplicationsList(applicationListPage);
          await wizard.collapseYamlPanel();
          await wizard.getApplicationNameInput().fill(applicationName);
          await wizard.pickComboboxOption(wizard.getArgoServerCombobox(), argoServerNamespace);
          await wizard.clickNext();
          await wizard.clickNext();
          await verifyPrivateRepoCredentialsAlertOnTemplate(wizard);
        });

        await test.step('Configure repository credentials opens GitOps repository settings', async () => {
          await verifyConfigureRepositoryCredentialsOpensGitOpsSettings(wizard, oc);
        });

        await test.step('Create ApplicationSet from private Git repository', async () => {
          await createArgoPushApplication(applicationListPage, wizard, options);
        });

        await test.step('Verify post-submit topology URL', async () => {
          await wizard.expectPostSubmitTopologyUrl(argoServerNamespace, applicationName);
        });

        await test.step('Wait for topology to show deployed Git path resources', async () => {
          const clusterResourceRows = options.clusterResources ?? [];
          if (clusterResourceRows.length === 0) {
            throw new Error(
              'RHACM4K-63608: ALC: clusterResources must be defined in argo-push scenario YAML'
            );
          }
          await verifyArgoPushPrivateRepoTopologyDeployed(applicationDetailsPage, {
            page,
            applicationSetName: applicationName,
            argoServerNamespace,
            destinationNamespace: options.destinationNamespace,
            clusterResourceRows,
          });
        });

        await test.step('Verify ApplicationSet details on Details tab', async () => {
          await verifyArgoPushPrivateRepoDetailsTab(applicationDetailsPage, options);
        });

        await test.step('Verify ApplicationSet exists on the hub', async () => {
          await expect
            .poll(() => oc.applicationSetExists(argoServerNamespace, applicationName), {
              timeout: 60_000,
            })
            .toBe(true);
        });

        await expect(page).toHaveURL(/\/multicloud\/applications\/details\//);
      }
    );
  }
);
