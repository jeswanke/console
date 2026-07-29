/** Ansible ALC subscription wizard tests. Polarion ids in file tags; Cypress `validateApplication` parity. */
import { clearE2eSpecDataCache, resolveSubscriptionScenarioByTestId } from '@config';
import {
  applyAnsibleAapAuthToSubscriptionOptions,
  skipUnlessAnsibleAapAuthConfigured,
} from '@lib/app/auth/ansible-aap';
import {
  createAnsibleTowerCredentialViaCredentialsTab,
  deleteAnsibleTowerCredentialViaUi,
  validateAnsibleTowerCredentialInTable,
} from '@lib/app/credentials/ansible-tower-credential';
import { createSubscription } from '@lib/app/subscription';
import { pollAnsibleJobCount } from '@lib/app/verify/ansible-jobs';
import {
  expectGitSubscriptionApiResourcesAbsent,
  hubSubscriptionListIncludesAppName,
  validateSubscriptionGitApplication,
} from '@lib/app/verify/validate-subscription-git-application';
import { CredentialsListPage } from '@pages/app/CredentialsListPage';
import { test } from '@fixtures/app-test';

const POST_CREATE_ANSIBLE_JOB_COUNT = 3;
const POST_CREATE_POLL_TIMEOUT = 300_000;

/** RHACM4K-3442 credential name (Cypress `testID`). */
const RHACM4K_3442_CREDENTIAL_NAME = 'rhacm4k-3442';

test.describe('Ansible Applications', {
  tag: ['@ALC', '@ansible', '@ansible-main', '@alc', '@app'],
}, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    clearE2eSpecDataCache();
  });

  test(
    'RHACM4K-20541: ALC: Ansible integration - Add new secret using credential pop-up wizard on Ansible Application Creation page',
    { tag: ['@e2e-ansible', '@RHACM4K-20541', '@UI'] },
    async ({
      page,
      oc,
      applicationListPage,
      applicationDetailsPage,
      subscriptionApplicationCreateWizardPage,
    }) => {
      test.setTimeout(900_000);

      const auth = skipUnlessAnsibleAapAuthConfigured(test, 'RHACM4K-20541');
      if (!auth) return;

      const { subscription: baseOptions, applicationExpectations: expectations } =
        resolveSubscriptionScenarioByTestId('RHACM4K-20541');
      const options = applyAnsibleAapAuthToSubscriptionOptions(baseOptions, auth);
      const { applicationName, namespace } = options;

      const subscriptionExists = await hubSubscriptionListIncludesAppName(
        oc,
        namespace,
        applicationName
      );

      if (!subscriptionExists) {
        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          options
        );
        await pollAnsibleJobCount({
          oc,
          namespace,
          count: POST_CREATE_ANSIBLE_JOB_COUNT,
          timeout: POST_CREATE_POLL_TIMEOUT,
          errorMessage: `expected ${POST_CREATE_ANSIBLE_JOB_COUNT} AnsibleJobs in ${namespace} after subscription create (RHACM4K-20541)`,
        });
      }

      await validateSubscriptionGitApplication({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        subscription: options,
        applicationExpectations: expectations,
      });

      await applicationListPage.deleteApplicationFromOverviewViaSearch({
        applicationName,
        namespace,
        removeRelatedResources: true,
        deleteNamespaceAfterUiDelete: true,
      });

      await expectGitSubscriptionApiResourcesAbsent(oc, applicationName, namespace);
    }
  );

  test(
    'RHACM4K-1560: ALC: Ansible integration - Pre and Post subscription',
    { tag: ['@e2e-ansible', '@RHACM4K-1560', '@UI', '@pre-restore', '@post-restore'] },
    async ({
      page,
      oc,
      applicationListPage,
      applicationDetailsPage,
      subscriptionApplicationCreateWizardPage,
    }) => {
      test.setTimeout(900_000);

      const auth = skipUnlessAnsibleAapAuthConfigured(test, 'RHACM4K-1560');
      if (!auth) return;

      const { subscription: options, applicationExpectations: expectations } =
        resolveSubscriptionScenarioByTestId('RHACM4K-1560');
      const { applicationName, namespace } = options;
      const secretName = options.perBlock?.[0]?.automation?.existingAnsibleSecret ?? 'ansible-pre-post-1560';

      await oc.ensureAnsibleCredentialSecret(secretName, 'default', auth.url, auth.token);

      const subscriptionExists = await hubSubscriptionListIncludesAppName(
        oc,
        namespace,
        applicationName
      );

      if (!subscriptionExists) {
        await applicationListPage.goto();
        await createSubscription(
          applicationListPage,
          subscriptionApplicationCreateWizardPage,
          options
        );
        await pollAnsibleJobCount({
          oc,
          namespace,
          count: POST_CREATE_ANSIBLE_JOB_COUNT,
          timeout: POST_CREATE_POLL_TIMEOUT,
          errorMessage: `expected ${POST_CREATE_ANSIBLE_JOB_COUNT} AnsibleJobs in ${namespace} after subscription create (RHACM4K-1560)`,
        });
      }

      await validateSubscriptionGitApplication({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        subscription: options,
        applicationExpectations: expectations,
      });

      await applicationListPage.deleteApplicationFromOverviewViaSearch({
        applicationName,
        namespace,
        removeRelatedResources: true,
        deleteNamespaceAfterUiDelete: true,
      });

      await expectGitSubscriptionApiResourcesAbsent(oc, applicationName, namespace);
    }
  );

  test(
    'RHACM4K-3442: ALC: Ansible Integration - Add Ansible Tower Secret using Credentials Tab',
    { tag: ['@e2e-ansible', '@RHACM4K-3442', '@UI'] },
    async ({ page, oc }) => {
      test.setTimeout(600_000);

      const auth = skipUnlessAnsibleAapAuthConfigured(test, 'RHACM4K-3442');
      if (!auth) return;

      const credentialsPage = new CredentialsListPage(page, oc);
      const credentialSpec = {
        secretName: RHACM4K_3442_CREDENTIAL_NAME,
        secretNamespace: 'default',
        ansibleHost: auth.url,
        ansibleToken: auth.token,
      };

      await createAnsibleTowerCredentialViaCredentialsTab(
        credentialsPage,
        credentialSpec
      );
      await validateAnsibleTowerCredentialInTable(credentialsPage, RHACM4K_3442_CREDENTIAL_NAME);
      await deleteAnsibleTowerCredentialViaUi(credentialsPage, RHACM4K_3442_CREDENTIAL_NAME);
    }
  );
});
