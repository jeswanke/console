/**
 * End-to-end: drive subscription create wizard using e2e-spec-data `auto_git_multi` + createSubscription.
 * Scenario extends `subscription_submit` — wizard clicks **Create** and should leave the create URL on success.
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

  test('createSubscription fills auto_git_multi YAML and submits', async ({
    page,
    applicationListPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(180_000);
    const resolved = getE2eScenario('auto_git_multi', E2E_SPEC_DATA_DIR);
    const options = getSubscriptionDomainPayload(resolved);
    expect(options.submit).toBe(true);

    await subscriptionApplicationCreateWizardPage.openFromApplicationsList(applicationListPage);
    await createSubscription(subscriptionApplicationCreateWizardPage, options);

    await expect(page).not.toHaveURL(/\/multicloud\/applications\/create\/subscription/, {
      timeout: 120_000,
    });
  });
});
