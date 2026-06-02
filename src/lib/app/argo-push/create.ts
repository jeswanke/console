/**
 * Argo CD ApplicationSet **push model** create wizard orchestration.
 */
import { expect } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';

import type { CreateArgoPushApplicationOptions } from './types';

async function fillGeneralStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<string> {
  const { applicationName, argoServerLabel } = options;
  await wizard.getApplicationNameInput().fill(applicationName);
  await wizard.pickComboboxOption(wizard.getArgoServerCombobox(), argoServerLabel);
  return argoServerLabel;
}

async function fillGeneratorsStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  requeueTimeSeconds?: number
): Promise<void> {
  if (requeueTimeSeconds === undefined) return;
  await wizard.pickComboboxOption(
    wizard.getRequeueTimeCombobox(),
    String(requeueTimeSeconds)
  );
}

async function fillGitTemplateStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const { git, destinationNamespace } = options;
  await wizard.getGitRepositoryTypeCard().click();
  await wizard.waitForLoad();

  await wizard.pickComboboxOption(wizard.getGitUrlCombobox(), git.url);
  if (git.branch) {
    await wizard.pickComboboxOption(wizard.getGitRevisionCombobox(), git.branch);
  } else {
    await wizard.pickFirstComboboxOption(wizard.getGitRevisionCombobox());
  }
  if (git.path) {
    await wizard.pickComboboxOption(wizard.getGitPathCombobox(), git.path);
  } else {
    await wizard.pickFirstComboboxOption(wizard.getGitPathCombobox());
  }
  await wizard.getDestinationNamespaceInput().fill(destinationNamespace);
}

async function fillPlacementStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  clusterSet: string
): Promise<void> {
  await wizard.pickComboboxOption(wizard.getClusterSetsCombobox(), clusterSet);
}

/**
 * Fills and submits the push-model ApplicationSet wizard (Git happy path).
 * Resolves Argo server namespace from `argoServerLabel` for duplicate detection and post-create waits.
 */
export async function createArgoPushApplication(
  applicationListPage: ApplicationListPage,
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<{ argoServerNamespace: string }> {
  const {
    collapseYamlPanel = true,
    submit = true,
    applicationSetExistsError = false,
    requeueTimeSeconds,
    clusterSet,
  } = options;

  const argoServerNamespace = options.argoServerLabel;
  const exists = await wizard.oc.applicationSetExists(argoServerNamespace, options.applicationName);
  if (exists) {
    if (applicationSetExistsError) {
      throw new Error(
        `createArgoPushApplication: ApplicationSet "${options.applicationName}" already exists in namespace "${argoServerNamespace}".`
      );
    }
    await wizard.gotoApplicationSetOverview(argoServerNamespace, options.applicationName);
    await wizard.waitForLoad();
    return { argoServerNamespace };
  }

  await wizard.openFromApplicationsList(applicationListPage);
  if (collapseYamlPanel) {
    await wizard.collapseYamlPanel();
  }

  await fillGeneralStep(wizard, options);
  await wizard.clickNext();

  await fillGeneratorsStep(wizard, requeueTimeSeconds);
  await wizard.clickNext();

  await fillGitTemplateStep(wizard, options);
  await wizard.clickNext();

  await wizard.clickNext();

  await fillPlacementStep(wizard, clusterSet);
  await wizard.clickNext();

  if (submit) {
    await wizard.clickSubmit();
    await waitForArgoPushApplicationAfterCreate(wizard, argoServerNamespace, options.applicationName);
  }

  return { argoServerNamespace };
}

/** Poll ApplicationSet CR and optional overview redirect after **Submit**. */
export async function waitForArgoPushApplicationAfterCreate(
  wizard: ArgoPushApplicationCreateWizardPage,
  argoServerNamespace: string,
  applicationSetName: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 180_000;

  await expect
    .poll(() => wizard.oc.applicationSetExists(argoServerNamespace, applicationSetName), {
      timeout,
      intervals: [2_000, 3_000, 5_000, 10_000],
      message: `Expected ApplicationSet "${applicationSetName}" in namespace "${argoServerNamespace}" after Submit`,
    })
    .toBe(true);

  try {
    await wizard.expectPostSubmitTopologyUrl(argoServerNamespace, applicationSetName, {
      timeout: Math.min(timeout, 120_000),
    });
  } catch {
    // Hub may land on list or details without topology query — callers can navigate explicitly.
  }
  await wizard.waitForLoad();
}
