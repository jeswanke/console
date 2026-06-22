/**
 * **Add credential** wizard on subscription create/edit (Ansible Automation Platform secret).
 */
import { expect } from '@playwright/test';
import { APP_SUBSCRIPTION_CREATE_WIZARD } from '@constants/app';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

import type { AddCredentialWizardSpec } from './types';

/** Completes the **Add credential** modal steps (dialog must already be open). */
export async function fillAddCredentialWizardDialog(
  wizard: SubscriptionApplicationCreateWizardPage,
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
  await expect(dialog).toBeHidden({ timeout: 60_000 });
  await wizard.waitForLoad();
}

/** Opens the modal from the existing-secret field and completes all wizard steps. */
export async function addAnsibleCredentialViaWizard(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: AddCredentialWizardSpec
): Promise<void> {
  const block = wizard.getRepositoryBlockContainer(blockIndex);
  const existingSecret = block.getByPlaceholder(
    APP_SUBSCRIPTION_CREATE_WIZARD.automation.existingSecretPlaceholder
  );
  await existingSecret.click();
  await wizard.getAddCredentialButton().click();

  await fillAddCredentialWizardDialog(wizard, spec);
}
