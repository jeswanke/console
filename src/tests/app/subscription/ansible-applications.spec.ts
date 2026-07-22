/** Ansible ALC subscription wizard tests. Polarion ids in file tags; Cypress `validateApplication` parity. */
import { clearE2eSpecDataCache, resolveSubscriptionScenarioByTestId } from '@config';
import { createAnsibleGitSubscriptionIfMissing } from '@lib/app/ansible/create-subscription-if-missing';
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
import {
  expectGitSubscriptionApiResourcesAbsent,
  hubSubscriptionListIncludesAppName,
  validateSubscriptionGitApplication,
} from '@lib/app/verify/validate-subscription-git-application';
import { CredentialsListPage } from '@pages/app/CredentialsListPage';
import { test } from '@fixtures/app-test';

/** Cypress post-create settle wait (Ansible_Test_Suite.cy.js RHACM4K-20541). */
const CYPRESS_POST_CREATE_WAIT_MS = 120_000;

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
        await page.waitForTimeout(CYPRESS_POST_CREATE_WAIT_MS);
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

      const { subscription: options, applicationExpectations: expectations } =
        resolveSubscriptionScenarioByTestId('RHACM4K-1560');
      const { applicationName, namespace } = options;

      await createAnsibleGitSubscriptionIfMissing({
        page,
        oc,
        applicationListPage,
        subscriptionApplicationCreateWizardPage,
        options,
        applicationName,
        namespace,
        postCreate: { kind: 'pollAnsibleJob', substring: 'prehook-test-1' },
      });

      await validateSubscriptionGitApplication({
        page,
        oc,
        applicationListPage,
        applicationDetailsPage,
        subscription: options,
        applicationExpectations: expectations,
      });
    }
  );

  test(
    'RHACM4K-3442: ALC: Ansible Integration - Add Ansible Tower Secret using Credentials Tab',
    { tag: ['@e2e-ansible', '@RHACM4K-3442', '@UI'] },
    async ({ page, subscriptionApplicationCreateWizardPage }) => {
      test.setTimeout(600_000);

      const auth = skipUnlessAnsibleAapAuthConfigured(test, 'RHACM4K-3442');
      if (!auth) return;

      const credentialsPage = new CredentialsListPage(page);
      const credentialSpec = {
        secretName: RHACM4K_3442_CREDENTIAL_NAME,
        secretNamespace: 'default',
        ansibleHost: auth.url,
        ansibleToken: auth.token,
      };

      await createAnsibleTowerCredentialViaCredentialsTab(
        credentialsPage,
        subscriptionApplicationCreateWizardPage,
        credentialSpec
      );
      await validateAnsibleTowerCredentialInTable(credentialsPage, RHACM4K_3442_CREDENTIAL_NAME);
      await deleteAnsibleTowerCredentialViaUi(credentialsPage, RHACM4K_3442_CREDENTIAL_NAME);
    }
  );
});
