/**
 * Subscription **create** wizard orchestration.
 */
import { expect } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

import type { CreateSubscriptionOptions } from './types';
import { applyPerBlockOptions, fillRepositoryBlockBySpec } from './wizard-fill';


/**
 * Fills the subscription **create** wizard using {@link SubscriptionApplicationCreateWizardPage} building blocks.
 *
 * Covers for each repository block:
 * - **Channel:** Git / Helm / object storage (`data-testid` fields)
 * - **Cluster deployment / time window / automation** — only from {@link CreateSubscriptionOptions.perBlock} (e2e-spec-data YAML).
 * - **Settings: Specify application behavior** / time window (timezone **Choose a location**, weekdays, ranges)
 * - **Configure automation for prehook and posthook**
 *
 * Placement **Cluster sets** / label **Label** and **Value** use menu picks ({@link SubscriptionApplicationCreateWizardPage.pickOpenMenuItemByExactLabel}).
 *
 * **Before** the wizard, runs {@link OcCliService.applicationsAppK8sIoExists}: if the Application exists and
 * {@link CreateSubscriptionOptions.applicationExistsError} is **false** (default), skips the wizard and navigates to
 * **Details** for that app (so callers can run the same post-create checks). If it exists and **applicationExistsError**
 * is **true**, throws. If it does not exist, opens the wizard via
 * {@link SubscriptionApplicationCreateWizardPage.openFromApplicationsList} then fills and optionally submits.
 *
 * Callers should open the hub **Applications** list first (e.g. `await applicationListPage.goto()`), then call this
 * function. When the app is absent, {@link SubscriptionApplicationCreateWizardPage.openFromApplicationsList} runs
 * (it navigates to the list again before **Create application → Subscription**).
 *
 * After **Create**, waits until the **Application** CR exists (and for a hub **Details** redirect when it
 * happens) before returning — callers can safely open Details / Topology.
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
    await submitButton.click();
    await wizard.waitForLoad();
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
      intervals: [2_000, 3_000, 5_000, 10_000],
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
  await wizard.waitForLoad();
}
