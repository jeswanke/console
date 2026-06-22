/**
 * Argo CD ApplicationSet **push model** create wizard orchestration.
 */
import { expect } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';

import type { CreateArgoPushApplicationOptions } from './types';
import { resolveApplicationSetNamespace } from './namespace';

async function fillGeneralStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const { applicationName, argoServerLabel } = options;
  await wizard.getApplicationNameInput().fill(applicationName);
  await wizard.pickComboboxOption(wizard.getArgoServerCombobox(), argoServerLabel);
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

async function fillSingleGitTemplateStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: Pick<CreateArgoPushApplicationOptions, 'git' | 'destinationNamespace'>
): Promise<void> {
  const { git, destinationNamespace } = options;
  await wizard.selectGitRepositoryTypeOnTemplate();
  await wizard.waitForLoad();
  await wizard.pickGitUrlOption(git.url);
  if (git.branch) {
    await wizard.pickGitRevisionOption(git.branch);
  } else {
    await wizard.pickFirstComboboxOption(wizard.getGitRevisionCombobox());
  }
  if (git.path) {
    await wizard.pickGitPathOption(git.path);
  } else {
    await wizard.pickFirstComboboxOption(wizard.getGitPathCombobox());
  }
  if (destinationNamespace) {
    await wizard.getDestinationNamespaceInput().clear();
    await wizard.getDestinationNamespaceInput().fill(destinationNamespace);
  }
}

async function fillMultiSourceTemplateStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: Pick<CreateArgoPushApplicationOptions, 'git' | 'helm' | 'destinationNamespace'>
): Promise<void> {
  const { git, helm, destinationNamespace } = options;
  if (!helm) {
    throw new Error('fillMultiSourceTemplateStep: helm repository spec is required');
  }

  await fillSingleGitTemplateStep(wizard, { git, destinationNamespace: '' });
  await wizard.addTemplateSource();
  await wizard.fillHelmOnLastTemplateSection(helm);
  await wizard.getDestinationNamespaceInput().clear();
  await wizard.getDestinationNamespaceInput().fill(destinationNamespace);
}

async function fillTemplateStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const { git, helm, multiSource, destinationNamespace } = options;

  if (!multiSource) {
    await fillSingleGitTemplateStep(wizard, { git, destinationNamespace });
    return;
  }

  await fillMultiSourceTemplateStep(wizard, { git, helm, destinationNamespace });
}

async function fillHelmOnlyTemplateStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: Pick<CreateArgoPushApplicationOptions, 'helm' | 'destinationNamespace'>
): Promise<void> {
  const { helm, destinationNamespace } = options;
  if (!helm) {
    throw new Error('fillHelmOnlyTemplateStep: helm repository spec is required');
  }
  await wizard.selectHelmRepositoryTypeOnTemplate();
  await wizard.waitForLoad();
  await wizard.fillHelmOnLastTemplateSection(helm);
  if (destinationNamespace) {
    await wizard.getDestinationNamespaceInput().clear();
    await wizard.getDestinationNamespaceInput().fill(destinationNamespace);
  }
}

async function fillTemplateStepForWizard(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const { git, helm, multiSource, destinationNamespace } = options;

  if (helm && !git?.path && !multiSource) {
    await fillHelmOnlyTemplateStep(wizard, { helm, destinationNamespace });
    return;
  }

  await fillTemplateStep(wizard, options);
}

async function fillGitTemplateStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  await fillTemplateStepForWizard(wizard, options);
}

async function fillPlacementStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: Pick<CreateArgoPushApplicationOptions, 'clusterSet' | 'placementLabelExpression'>
): Promise<void> {
  const { clusterSet, placementLabelExpression } = options;
  await wizard.pickComboboxOption(wizard.getClusterSetsCombobox(), clusterSet);
  if (placementLabelExpression) {
    await wizard.fillPlacementLabelExpression(placementLabelExpression);
  }
}

async function fillSyncPolicyStep(
  wizard: ArgoPushApplicationCreateWizardPage,
  options: Pick<CreateArgoPushApplicationOptions, 'disableAutomatedSync'>
): Promise<void> {
  if (!options.disableAutomatedSync) return;
  const page = wizard.getPage();
  const automated = page.locator('#spec-template-spec-syncpolicy-automated-enabled input[type="checkbox"]').or(
    page.locator('input[id="spec-template-spec-syncpolicy-automated-enabled"]')
  );
  await automated.scrollIntoViewIfNeeded();
  if (await automated.isChecked().catch(() => false)) {
    await automated.click({ force: true });
  }
}

/**
 * Fills the push-model wizard through **Placement** and lands on **Review** without submitting.
 */
export async function fillArgoPushWizardToReview(
  applicationListPage: ApplicationListPage,
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  const { collapseYamlPanel = true } = options;

  await wizard.openFromApplicationsList(applicationListPage);
  if (collapseYamlPanel) {
    await wizard.collapseYamlPanel();
  }

  await fillGeneralStep(wizard, options);
  await wizard.clickNext();

  await fillGeneratorsStep(wizard, options.requeueTimeSeconds);
  await wizard.clickNext();

  await fillGitTemplateStep(wizard, options);
  await wizard.clickNext();

  await fillSyncPolicyStep(wizard, options);
  await wizard.clickNext();

  await fillPlacementStep(wizard, options);
  await wizard.clickNext();

  await wizard.expectOnReviewStep();
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
  } = options;

  const argoServerNamespace = resolveApplicationSetNamespace(options);
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

  await fillSyncPolicyStep(wizard, options);
  await wizard.clickNext();

  await fillPlacementStep(wizard, options);
  await wizard.clickNext();

  if (submit) {
    await wizard.clickSubmit();
    await waitForArgoPushApplicationAfterCreate(wizard, argoServerNamespace, options.applicationName);
    if (options.postCreateWaitMs && options.postCreateWaitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.postCreateWaitMs));
    }
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
