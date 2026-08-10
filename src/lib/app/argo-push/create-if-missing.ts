import { expect, type Page } from '@playwright/test';
import type { OcCliService } from '@services/OcCliService';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import { cleanupArgoPushApplication } from './cleanup';
import { createArgoPushApplication } from './create';
import { resolveApplicationSetNamespace } from './namespace';
import type { CreateArgoPushApplicationOptions } from './types';

async function applicationSetGitPathMatches(
  oc: OcCliService,
  namespace: string,
  applicationSetName: string,
  expectedPath: string
): Promise<boolean> {
  if (!(await oc.applicationSetExists(namespace, applicationSetName))) {
    return false;
  }
  return oc.applicationSetHasGitSourcePath(namespace, applicationSetName, expectedPath);
}

/** Cypress `oc get applicationset` + `createArgoApplication` when missing or template git path is invalid. */
export async function createArgoPushApplicationIfMissing(
  oc: OcCliService,
  applicationListPage: ApplicationListPage,
  wizard: ArgoPushApplicationCreateWizardPage,
  page: Page,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const argoServerNamespace = resolveApplicationSetNamespace(options);
  const { applicationName, git } = options;
  const expectedGitPath = git?.path?.trim();

  if (expectedGitPath) {
    const pathValid = await applicationSetGitPathMatches(
      oc,
      argoServerNamespace,
      applicationName,
      expectedGitPath
    );
    if (pathValid) {
      return;
    }
    if (await oc.applicationSetExists(argoServerNamespace, applicationName)) {
      await cleanupArgoPushApplication(oc, options);
    }
  } else if (await oc.applicationSetExists(argoServerNamespace, applicationName)) {
    return;
  }

  await applicationListPage.goto();
  await createArgoPushApplication(applicationListPage, wizard, page, options);

  await expect
    .poll(() => oc.applicationSetExists(argoServerNamespace, applicationName), {
      timeout: 30_000,
      intervals: [2_000, 5_000],
      message: `ApplicationSet ${argoServerNamespace}/${applicationName} should exist after wizard creation`,
    })
    .toBe(true);

  if (expectedGitPath) {
    const pathValid = await oc.applicationSetHasGitSourcePath(
      argoServerNamespace,
      applicationName,
      expectedGitPath
    );
    if (!pathValid) {
      const actual = await oc.getApplicationSetTemplateGitPath(
        argoServerNamespace,
        applicationName
      );
      throw new Error(
        `ApplicationSet ${argoServerNamespace}/${applicationName} git path is "${actual ?? ''}"; expected "${expectedGitPath}" (Argo CD InvalidSpecError: source.path required)`
      );
    }
  }

  if (options.postCreateWaitMs && options.postCreateWaitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, options.postCreateWaitMs));
  }
}

/** {@link cleanupArgoPushApplication} then wizard create (fresh ApplicationSet every run). */
export async function recreateArgoPushApplication(
  oc: OcCliService,
  applicationListPage: ApplicationListPage,
  wizard: ArgoPushApplicationCreateWizardPage,
  page: Page,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  await cleanupArgoPushApplication(oc, options);
  await applicationListPage.goto();
  await createArgoPushApplication(applicationListPage, wizard, page, options);
}
