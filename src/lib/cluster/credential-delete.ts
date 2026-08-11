/**
 * Credential deletion orchestration — kebab menu and bulk delete via UI.
 */
import type { CredentialsListPage } from '@pages/cluster/CredentialsListPage';

export async function deleteCredentialByKebab(
  credentialsListPage: CredentialsListPage,
  name: string
): Promise<void> {
  await credentialsListPage.goto();
  await credentialsListPage.searchCredential(name);
  await credentialsListPage.deleteCredentialByKebab(name);
}

export async function deleteCredentialsByBulk(
  credentialsListPage: CredentialsListPage,
  names: string[]
): Promise<void> {
  await credentialsListPage.goto();
  await credentialsListPage.deleteCredentialsByBulk(names);
}
