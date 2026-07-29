/**
 * Subscription **create** wizard orchestration.
 */
import { expect } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

import type { CreateSubscriptionOptions } from './types';
import { applyPerBlockOptions, fillRepositoryBlockBySpec } from './wizard-fill';


/**
 * Fills and submits the subscription create wizard from e2e-spec options.
 * Skips wizard when the Application already exists (opens Details unless `applicationExistsError`).
 */
export async function createSubscription(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  options: CreateSubscriptionOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    repositories,
    perBlock,
    ensureFormMode = true,
    submit = true,
    applicationExistsError = false,
  } = options;

  if (!repositories?.length) {
    throw new Error(
      'createSubscription: `repositories` must be a non-empty array (define under e2e-spec-data blocks / subscription).'
    );
  }

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (exists) {
    if (applicationExistsError) {
      throw new Error(
        `createSubscription: Application "${applicationName}" already exists in namespace "${namespace}" ` +
          '(applications.app.k8s.io). Delete it or pick another name/namespace, or set applicationExistsError to ' +
          '`false` (default) to skip the wizard and open Details when the app is already present.'
      );
    }
    await wizard.gotoApplicationDetailsTab(namespace, applicationName);
    return;
  }

  await wizard.openFromApplicationsList(applicationListPage);

  if (ensureFormMode) {
    await wizard.collapseYamlEditor();
  }

  await wizard.getApplicationNameInput().fill(applicationName);

  const nsInput = wizard.getNamespaceInput();
  await nsInput.fill(namespace);
  await nsInput.press('Enter').catch(() => undefined);
  await wizard.waitForLoad();

  for (let blockIndex = 0; blockIndex < repositories.length; blockIndex++) {
    if (blockIndex > 0) {
      await wizard.getAddChannelsButton().click();
      await wizard.waitForLoad();
      await wizard.getRepositoryBlockContainer(blockIndex).waitFor({ state: 'visible', timeout: 60_000 });
    }

    const spec = repositories[blockIndex]!;
    await fillRepositoryBlockBySpec(wizard, blockIndex, spec);

    await applyPerBlockOptions(wizard, blockIndex, perBlock?.[blockIndex]);
  }

  if (submit) {
    const submitButton = wizard.getPrimarySubmitButton();
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click({ force: true });
    // Poll the Application CR immediately — do not wait on page-wide skeletons first.
    // After Create the console may keep PF skeletons mounted while navigating; that used to
    // stall `waitForLoad` long enough for the app to be deleted before the existence poll ran.
    await waitForSubscriptionApplicationAfterCreate(wizard, namespace, applicationName);
  }
}

/**
 * Polls until `applications.app.k8s.io` exists, then optionally waits for post–Create navigation off the wizard.
 */
export async function waitForSubscriptionApplicationAfterCreate(
  wizard: SubscriptionApplicationCreateWizardPage,
  namespace: string,
  applicationName: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 180_000;

  await expect
    .poll(() => wizard.oc.applicationsAppK8sIoExists(namespace, applicationName), {
      timeout,
      intervals: [1_000, 2_000, 3_000, 5_000],
      message: `Expected Application "${applicationName}" in namespace "${namespace}" after Create`,
    })
    .toBe(true);

  try {
    await wizard.expectOnApplicationDetailsTabUrl(namespace, applicationName, {
      timeout: Math.min(timeout, 120_000),
    });
  } catch {
    // Hub may stay on the create route or return to the list; callers navigate via ApplicationDetailsPage.
  }

  // Soft settle only — details/topology can keep PF skeletons mounted; do not block the test on them.
  await wizard.waitForLoad(15_000).catch(() => undefined);
}
