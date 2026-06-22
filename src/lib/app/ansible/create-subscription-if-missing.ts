import type { Page } from '@playwright/test';
import type { OcCliService } from '@services/OcCliService';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';
import { createSubscription } from '@lib/app/subscription';
import { pollAnsibleJobsInclude } from '@lib/app/verify/ansible-jobs';
import { hubSubscriptionListIncludesAppName } from '@lib/app/verify/validate-subscription-git-application';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';

export type PostCreateAnsibleSubscription =
  | { kind: 'wait'; timeoutMs: number }
  | { kind: 'pollAnsibleJob'; substring: string; timeoutMs?: number };

export type CreateAnsibleGitSubscriptionIfMissingParams = {
  page: Page;
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  subscriptionApplicationCreateWizardPage: SubscriptionApplicationCreateWizardPage;
  options: CreateSubscriptionOptions;
  applicationName: string;
  namespace: string;
  postCreate?: PostCreateAnsibleSubscription;
};

/**
 * Cypress `if (!subscriptionList.includes(name)) { createApplication(...) }` for ansible git apps.
 */
export async function createAnsibleGitSubscriptionIfMissing(
  params: CreateAnsibleGitSubscriptionIfMissingParams
): Promise<void> {
  const exists = await hubSubscriptionListIncludesAppName(
    params.oc,
    params.namespace,
    params.applicationName
  );
  if (exists) {
    return;
  }

  await params.applicationListPage.goto();
  await createSubscription(
    params.applicationListPage,
    params.subscriptionApplicationCreateWizardPage,
    params.options
  );

  if (params.postCreate?.kind === 'wait') {
    await params.page.waitForTimeout(params.postCreate.timeoutMs);
  } else if (params.postCreate?.kind === 'pollAnsibleJob') {
    await pollAnsibleJobsInclude({
      oc: params.oc,
      namespace: params.namespace,
      substring: params.postCreate.substring,
      timeout: params.postCreate.timeoutMs,
      errorMessage: `Timed out waiting for AnsibleJob containing "${params.postCreate.substring}" in ${params.namespace}`,
    });
  }
}
