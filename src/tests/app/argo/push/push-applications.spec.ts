/** Git push-model ApplicationSet create (requires GitOps prep / `E2E_GITOPS_PREP`). */
import { resolveArgoPushScenarioById } from '@config';
import { cleanupArgoPushApplication, createArgoPushApplication } from '@lib/app/argo-push';
import { expect, test } from '@fixtures/app-test';

test.describe(
  'Git Push Applications',
  { tag: ['@alc', '@app', '@git', '@gitops', '@argo', '@push-model'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      'PUSH-GIT-HELLOWORLD: Create a Git ApplicationSet (push model) deployed via GitOps',
      { tag: ['@create', '@UI', '@e2e-common', '@RHACM4K-PUSH-GIT-HELLOWORLD'] },
      async ({ oc, applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(300_000);

        const { argoPush: options } = resolveArgoPushScenarioById('auto_git_push_helloworld');
        const { argoServerLabel: argoServerNamespace, applicationName } = options;

        await cleanupArgoPushApplication(oc, options);

        await applicationListPage.goto();
        await createArgoPushApplication(
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          options
        );

        await argoPushApplicationCreateWizardPage.expectPostSubmitTopologyUrl(
          argoServerNamespace,
          applicationName
        );
        await expect
          .poll(() => oc.applicationSetExists(argoServerNamespace, applicationName), {
            timeout: 60_000,
          })
          .toBe(true);
      }
    );
  }
);
