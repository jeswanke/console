/**
 * Subscription **edit** / add / delete flows on existing applications.
 */
import { expect, type Page } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

import type {
  AddSubscriptionToExistingApplicationOptions,
  DeleteSubscriptionFromExistingApplicationOptions,
  EditSubscriptionInExistingApplicationOptions,
} from './types';
import { applyPerBlockOptions, fillRepositoryBlockBySpec } from './wizard-fill';

/**
 * Opens an existing subscription application in **Edit** mode, appends one or more repository blocks
 * (subscriptions), fills the new blocks, and optionally clicks **Update**.
 *
 * Unlike {@link createSubscription}, this requires the Application CR to already exist.
 */
export async function addSubscriptionToExistingApplication(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  page: Page,
  options: AddSubscriptionToExistingApplicationOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    repositories,
    perBlock,
    ensureFormMode = true,
    submit = true,
    entry = 'list',
    expectedEditUrl,
    expectedPostSubmitUrl,
    expectedUrlTimeout = 120_000,
  } = options;

  if (!repositories?.length) {
    throw new Error(
      'addSubscriptionToExistingApplication: `repositories` must be a non-empty array (new blocks to append).'
    );
  }

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (!exists) {
    throw new Error(
      `addSubscriptionToExistingApplication: Application "${applicationName}" does not exist in namespace "${namespace}" ` +
        '(applications.app.k8s.io). Create it first before adding another subscription.'
    );
  }

  if (entry === 'details') {
    await wizard.openEditFromApplicationDetails(namespace, applicationName);
  } else {
    await wizard.openEditFromApplicationsList(applicationListPage, applicationName);
  }

  if (expectedEditUrl !== undefined) {
    await wizard.expectUrl(expectedEditUrl, { timeout: expectedUrlTimeout });
  } else {
    await wizard.expectOnEditSubscriptionUrl(namespace, applicationName, {
      timeout: expectedUrlTimeout,
    });
  }

  if (ensureFormMode) {
    await wizard.collapseYamlEditor();
  }

  const existingBlockCount = await wizard.getRepositoryBlockContainers().count();

  for (let addIndex = 0; addIndex < repositories.length; addIndex++) {
    const blockIndex = existingBlockCount + addIndex;
    await wizard.getAddChannelsButton().click();
    await wizard.waitForLoad();
    await wizard
      .getRepositoryBlockContainer(blockIndex)
      .waitFor({ state: 'visible', timeout: 60_000 });

    const spec = repositories[addIndex]!;
    await fillRepositoryBlockBySpec(wizard, blockIndex, spec);
    await applyPerBlockOptions(wizard, page, blockIndex, perBlock?.[addIndex]);
  }

  if (submit) {
    const submitButton = wizard.getPrimarySubmitButton();
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    await submitButton.click();
    await wizard.waitForLoad();
    if (expectedPostSubmitUrl !== undefined) {
      await wizard.expectUrl(expectedPostSubmitUrl, { timeout: expectedUrlTimeout });
    } else if (entry === 'details') {
      await wizard.expectOnApplicationDetailsTabUrl(namespace, applicationName, {
        timeout: expectedUrlTimeout,
      });
    } else {
      await wizard.expectOnApplicationsListUrl({ timeout: expectedUrlTimeout });
    }
  }
}

export async function editSubscriptionInExistingApplication(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  page: Page,
  options: EditSubscriptionInExistingApplicationOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    repositories,
    perBlock,
    ensureFormMode = true,
    submit = true,
    entry = 'details',
    expectedEditUrl,
    expectedPostSubmitUrl,
    expectedUrlTimeout = 120_000,
  } = options;

  if (!repositories?.length) {
    throw new Error(
      'editSubscriptionInExistingApplication: `repositories` must be a non-empty array (existing blocks to update).'
    );
  }

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (!exists) {
    throw new Error(
      `editSubscriptionInExistingApplication: Application "${applicationName}" does not exist in namespace "${namespace}" ` +
        '(applications.app.k8s.io). Create it first before editing.'
    );
  }

  if (entry === 'details') {
    await wizard.openEditFromApplicationDetails(namespace, applicationName);
  } else {
    await wizard.openEditFromApplicationsList(applicationListPage, applicationName);
  }

  if (expectedEditUrl !== undefined) {
    await wizard.expectUrl(expectedEditUrl, { timeout: expectedUrlTimeout });
  } else {
    await wizard.expectOnEditSubscriptionUrl(namespace, applicationName, {
      timeout: expectedUrlTimeout,
    });
  }

  if (ensureFormMode) {
    await wizard.collapseYamlEditor();
  }

  const existingBlockCount = await wizard.getRepositoryBlockContainers().count();
  if (repositories.length > existingBlockCount) {
    throw new Error(
      `editSubscriptionInExistingApplication: requested update for ${repositories.length} repository blocks, but only ${existingBlockCount} block(s) exist.`
    );
  }

  for (let blockIndex = 0; blockIndex < repositories.length; blockIndex++) {
    await wizard
      .getRepositoryBlockContainer(blockIndex)
      .waitFor({ state: 'visible', timeout: 60_000 });
    const spec = repositories[blockIndex]!;
    await fillRepositoryBlockBySpec(wizard, blockIndex, spec);
    await applyPerBlockOptions(wizard, page, blockIndex, perBlock?.[blockIndex]);
  }

  if (submit) {
    const submitButton = wizard.getPrimarySubmitButton();
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    await submitButton.click();
    await wizard.waitForLoad();
    if (expectedPostSubmitUrl !== undefined) {
      await wizard.expectUrl(expectedPostSubmitUrl, { timeout: expectedUrlTimeout });
    } else if (entry === 'details') {
      await wizard.expectOnApplicationDetailsTabUrl(namespace, applicationName, {
        timeout: expectedUrlTimeout,
      });
    } else {
      await wizard.expectOnApplicationsListUrl({ timeout: expectedUrlTimeout });
    }
  }
}

/**
 * Opens an existing subscription application in **Edit** mode, deletes one repository block
 * (subscription), and optionally clicks **Update**.
 */
export async function deleteSubscriptionFromExistingApplication(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  options: DeleteSubscriptionFromExistingApplicationOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    deleteBlockIndex,
    ensureFormMode = true,
    submit = true,
    entry = 'details',
    expectedEditUrl,
    expectedPostSubmitUrl,
    expectedUrlTimeout = 120_000,
  } = options;

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (!exists) {
    throw new Error(
      `deleteSubscriptionFromExistingApplication: Application "${applicationName}" does not exist in namespace "${namespace}" ` +
        '(applications.app.k8s.io). Create it first before deleting a subscription.'
    );
  }

  if (entry === 'details') {
    await wizard.openEditFromApplicationDetails(namespace, applicationName);
  } else {
    await wizard.openEditFromApplicationsList(applicationListPage, applicationName);
  }

  if (expectedEditUrl !== undefined) {
    await wizard.expectUrl(expectedEditUrl, { timeout: expectedUrlTimeout });
  } else {
    await wizard.expectOnEditSubscriptionUrl(namespace, applicationName, {
      timeout: expectedUrlTimeout,
    });
  }

  if (ensureFormMode) {
    await wizard.collapseYamlEditor();
  }

  const beforeRepoCount = await wizard.getRepositoryBlockContainers().count();
  const beforeDeleteControls = await wizard.getDeleteRepositoryButtons().count();
  if (beforeRepoCount <= 1) {
    throw new Error(
      `deleteSubscriptionFromExistingApplication: expected at least 2 repository blocks, found ${beforeRepoCount}.`
    );
  }

  const blockIndex = deleteBlockIndex ?? beforeRepoCount - 1;
  if (blockIndex < 0 || blockIndex >= beforeRepoCount) {
    throw new Error(
      `deleteSubscriptionFromExistingApplication: deleteBlockIndex ${blockIndex} is out of range (0..${beforeRepoCount - 1}).`
    );
  }
  if (beforeDeleteControls < 1) {
    throw new Error(
      `deleteSubscriptionFromExistingApplication: expected at least one delete control, found ${beforeDeleteControls}.`
    );
  }

  let deleteControlIndex = blockIndex;
  // Some console variants do not render a delete control for the first repository.
  if (beforeDeleteControls === beforeRepoCount - 1) {
    if (blockIndex === 0) {
      throw new Error(
        'deleteSubscriptionFromExistingApplication: first repository block is not deletable in this UI variant.'
      );
    }
    deleteControlIndex = blockIndex - 1;
  } else if (deleteControlIndex >= beforeDeleteControls) {
    deleteControlIndex = beforeDeleteControls - 1;
  }

  const targetRepoSectionToggle = wizard.getRepositoryTypeSectionToggleInBlock(blockIndex);
  const targetRepoSectionCountBefore = await targetRepoSectionToggle.count();

  const deleteButton = wizard.getDeleteRepositoryButtons().nth(deleteControlIndex);
  await deleteButton.scrollIntoViewIfNeeded();
  await deleteButton.waitFor({ state: 'visible', timeout: 30_000 });
  await deleteButton.click();
  await wizard.waitForLoad();

  await expect
    .poll(async () => wizard.getRepositoryBlockContainers().count(), {
      timeout: 30_000,
      intervals: [500, 1_000, 2_000],
      message: `Expected repository blocks to decrease from ${beforeRepoCount} to ${beforeRepoCount - 1}`,
    })
    .toBe(beforeRepoCount - 1);

  if (targetRepoSectionCountBefore > 0 && beforeRepoCount - 1 === 0) {
    await expect(targetRepoSectionToggle).toHaveCount(0, { timeout: 30_000 });
  }

  if (submit) {
    const submitButton = wizard.getPrimarySubmitButton();
    await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(submitButton).toBeEnabled({ timeout: 30_000 });
    await submitButton.click();
    await wizard.waitForLoad();
    if (expectedPostSubmitUrl !== undefined) {
      await wizard.expectUrl(expectedPostSubmitUrl, { timeout: expectedUrlTimeout });
    } else if (entry === 'details') {
      await wizard.expectOnApplicationDetailsTabUrl(namespace, applicationName, {
        timeout: expectedUrlTimeout,
      });
    } else {
      await wizard.expectOnApplicationsListUrl({ timeout: expectedUrlTimeout });
    }
  }
}
