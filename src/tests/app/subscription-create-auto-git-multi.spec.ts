/**
 * End-to-end: drive subscription create wizard using e2e-spec-data `auto_git_multi` + createSubscription.
 * Requires authenticated hub (chromium project + setup). Does not submit (scenario uses submit: false).
 */
import path from 'path';
import {
  clearE2eSpecDataCache,
  getE2eScenario,
  getSubscriptionDomainPayload,
} from '@config';
import { test, expect } from '@fixtures/app-test';
import { createSubscription } from '@lib/subscription-create';

const E2E_SPEC_DATA_DIR = path.join(process.cwd(), 'src/config/e2e-spec-data');

test.describe('Subscription create — auto_git_multi from e2e-spec-data', { tag: ['@alc', '@app'] }, () => {
  test.beforeEach(() => {
    clearE2eSpecDataCache();
  });

  test('createSubscription fills wizard from auto_git_multi YAML (dry run)', async ({
    applicationListPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    const resolved = getE2eScenario('auto_git_multi', E2E_SPEC_DATA_DIR);
    const options = getSubscriptionDomainPayload(resolved);

    await subscriptionApplicationCreateWizardPage.openFromApplicationsList(applicationListPage);
    await createSubscription(subscriptionApplicationCreateWizardPage, options);

    await expect(subscriptionApplicationCreateWizardPage.getApplicationNameInput()).toHaveValue(
      options.applicationName
    );

    await expect(
      subscriptionApplicationCreateWizardPage.getGitPathInputInRepositoryBlock(0)
    ).toHaveValue('helloworld');
    await expect(
      subscriptionApplicationCreateWizardPage.getGitPathInputInRepositoryBlock(1)
    ).toHaveValue('mortgage');

    await expect(subscriptionApplicationCreateWizardPage.getRepositoryBlockContainer(1)).toBeVisible();
    await expect(subscriptionApplicationCreateWizardPage.getCreateButton()).toBeVisible();
  });
});
