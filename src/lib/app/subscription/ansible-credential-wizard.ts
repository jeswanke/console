/**
 * **Add credential** wizard on subscription create/edit (Ansible Automation Platform secret).
 */
import { expect, type Page } from '@playwright/test';
import { APP_SUBSCRIPTION_CREATE_WIZARD } from '@constants/app';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

import type { AddCredentialWizardSpec } from './types';

/** Completes the **Add credential** modal steps (dialog must already be open). */
export async function fillAddCredentialWizardDialog(
  wizard: SubscriptionApplicationCreateWizardPage,
  page: Page,
  spec: AddCredentialWizardSpec
): Promise<void> {
  const { secretName, secretNamespace, ansibleHost, ansibleToken } = spec;
  if (!ansibleHost || !ansibleToken) {
    throw new Error(
      'fillAddCredentialWizardDialog: ansibleHost and ansibleToken are required (merge via applyAnsibleAapAuthToSubscriptionOptions).'
    );
  }

  const dialog = wizard.getAddCredentialDialog();
  await expect(dialog).toBeVisible({ timeout: 30_000 });

  await wizard.getAddCredentialCredentialsNameInput().fill(secretName);
  await wizard.pickAddCredentialNamespace(secretNamespace);
  await wizard.getAddCredentialDialogNextButton().click();

  await wizard.getAddCredentialAnsibleHostInput().fill(ansibleHost);
  await wizard.getAddCredentialAnsibleTokenInput().fill(ansibleToken);
  await wizard.getAddCredentialDialogNextButton().click();

  const addButton = wizard.getAddCredentialDialogAddButton();
  await expect(addButton).toBeEnabled({ timeout: 30_000 });
  await addButton.click();
  if (await dialog.isVisible()) {
    await page.waitForTimeout(2_000);
    if (await dialog.isVisible()) {
      await addButton.click({ force: true });
    }
  }
  await expect(dialog).toBeHidden({ timeout: 60_000 });
  await wizard.waitForLoad();
}

/** Opens the modal from the existing-secret field and completes all wizard steps. */
export async function addAnsibleCredentialViaWizard(
  wizard: SubscriptionApplicationCreateWizardPage,
  page: Page,
  blockIndex: number,
  spec: AddCredentialWizardSpec
): Promise<void> {
  const credInput = page.locator('[data-testid="select-connection"]');

  const secretExists = await wizard.oc
    .run(`oc get secret ${spec.secretName} -n ${spec.secretNamespace} --ignore-not-found -o name`)
    .then((out) => out.trim().length > 0)
    .catch(() => false);

  if (!secretExists) {
    const block = wizard.getRepositoryBlockContainer(blockIndex);
    const existingSecret = block.getByPlaceholder(
      APP_SUBSCRIPTION_CREATE_WIZARD.automation.existingSecretPlaceholder
    );
    await existingSecret.click();
    await wizard.getAddCredentialButton().click();
    await fillAddCredentialWizardDialog(wizard, page, spec);

    if (!page.url().includes('/create/subscription')) {
      await page.goBack();
      await wizard.waitForLoad();
    }
  }

  await credInput.scrollIntoViewIfNeeded();

  // After dialog close the PF6 combobox auto-fills the credential name as both
  // value and placeholder, but React's form state does NOT register it as a
  // proper selection (aria-expanded stays false, onChange never fired).
  // Playwright's clear()/fill("") are no-ops here because the controlled
  // component snaps the value back.  Use the PF6 "Clear input value" button
  // which properly resets the React state, then re-type with pressSequentially
  // so individual key events trigger typeahead filtering.
  const credInputGroup = credInput.locator(
    'xpath=ancestor::div[contains(@class,"pf-v6-c-text-input-group")]'
  );
  const clearBtn = credInputGroup.locator('[aria-label="Clear input value"]');
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(500);
  }

  await credInput.click();
  await credInput.pressSequentially(spec.secretName, { delay: 30 });
  await page.waitForTimeout(1_000);

  const option = page.locator(`#select-typeahead-${spec.secretName}`);
  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();
  await wizard.waitForLoad();
}
