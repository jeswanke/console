/**
 * Ansible Automation Platform credentials on Fleet Management → Credentials.
 * Cypress parity: `createAnsibleCredential` / `validateAnsibleCredential` in common.js.
 */
import { expect } from '@playwright/test';
import type { CredentialsListPage } from '@pages/app/CredentialsListPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';
import { fillAddCredentialWizardDialog } from '@lib/app/subscription/ansible-credential-wizard';
import type { AddCredentialWizardSpec } from '@lib/app/subscription/types';

export type AnsibleTowerCredentialSpec = AddCredentialWizardSpec;

/** Create an Ansible Tower credential via Credentials → Add → Ansible (RHACM4K-3442). */
export async function createAnsibleTowerCredentialViaCredentialsTab(
  credentialsPage: CredentialsListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  spec: AnsibleTowerCredentialSpec
): Promise<void> {
  await credentialsPage.goto();
  await credentialsPage.openAddAnsibleCredentialWizard();
  await fillAddCredentialWizardDialog(wizard, spec);
}

/** Assert the credential row is visible in the credentials table (Cypress search + table contain). */
export async function validateAnsibleTowerCredentialInTable(
  credentialsPage: CredentialsListPage,
  credentialName: string
): Promise<void> {
  await credentialsPage.goto();
  await credentialsPage.getSearchInput().fill(credentialName);
  await expect(credentialsPage.getCredentialRow(credentialName)).toBeVisible({ timeout: 60_000 });
}

/** Delete credential via row actions menu (RHACM4K-3442). */
export async function deleteAnsibleTowerCredentialViaUi(
  credentialsPage: CredentialsListPage,
  credentialName: string
): Promise<void> {
  await credentialsPage.goto();
  await credentialsPage.getCredentialActionsButton(credentialName).click();
  await credentialsPage.clickDeleteCredentialMenuItem();
  await credentialsPage.clickDeleteCredentialConfirmButton();
  await credentialsPage.waitForLoad();
}
