/**
 * Ansible Automation Platform credentials on Fleet Management → Credentials.
 * Cypress parity: `createAnsibleCredential` / `validateAnsibleCredential` in common.js.
 */
import { expect } from '@playwright/test';
import type { CredentialsListPage } from '@pages/app/CredentialsListPage';
import type { AddCredentialWizardSpec } from '@lib/app/subscription/types';

export type AnsibleTowerCredentialSpec = AddCredentialWizardSpec;

/** Create an Ansible Tower credential via Credentials → Add → Ansible (RHACM4K-3442). */
export async function createAnsibleTowerCredentialViaCredentialsTab(
  credentialsPage: CredentialsListPage,
  spec: AnsibleTowerCredentialSpec
): Promise<void> {
  const { secretName, secretNamespace, ansibleHost, ansibleToken } = spec;
  if (!ansibleHost || !ansibleToken) {
    throw new Error('createAnsibleTowerCredentialViaCredentialsTab: ansibleHost and ansibleToken are required.');
  }

  await credentialsPage.goto();
  await credentialsPage.openAddAnsibleCredentialWizard();

  const page = credentialsPage.getPage();
  await page.locator('#credentialsName').fill(secretName);
  const nsCombo = page.locator('#namespaceName');
  await nsCombo.click();
  await nsCombo.fill(secretNamespace);
  await page.waitForTimeout(500);
  const nsOption = page.getByRole('option', { name: secretNamespace, exact: true }).first();
  if (await nsOption.isVisible().catch(() => false)) await nsOption.click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.locator('#ansibleHost').fill(ansibleHost);
  await page.locator('#ansibleToken').fill(ansibleToken);
  await page.getByRole('button', { name: 'Next' }).click();

  const addButton = page.getByRole('button', { name: 'Add', exact: true });
  await expect(addButton).toBeEnabled({ timeout: 30_000 });
  await addButton.click();
  await credentialsPage.waitForLoad();
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
