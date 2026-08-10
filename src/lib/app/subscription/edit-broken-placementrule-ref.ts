/**
 * RHACM4K-49630 — edit subscription whose `placementRef` has `kind: PlacementRule` but no `name`.
 *
 * Legacy hubs: check **existing placement rule** and pick the rule from the combo (Cypress parity).
 * PF6 hubs: select **existing placement configuration** and pick the matching Placement resource
 * (fixture seeds `git-placementrule-placement-1` Placement + legacy PlacementRule).
 */
import { expect } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

import { enableExistingPlacementConfigurationInRepositoryBlock } from './placement-wizard-verify';

export type EditSubscriptionBrokenPlacementRuleRefOptions = {
  applicationName: string;
  namespace: string;
  placementRuleName: string;
  /** PF6 existing-placement combo value (Placement CR name). */
  placementName?: string;
  blockIndex?: number;
  entry?: 'list' | 'details';
  expectedUrlTimeout?: number;
};

async function fillBrokenPlacementRuleRefClusterDeployment(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  placementRuleName: string,
  placementName?: string
): Promise<void> {
  await wizard.expandClusterDeploymentSectionForRepositoryBlock(blockIndex);

  const legacyCheckbox = wizard.getExistingPlacementRuleCheckboxInRepositoryBlock(blockIndex);
  const legacyLabel = wizard
    .getRepositoryBlockContainer(blockIndex)
    .locator('#existingrule-checkbox-label');
  const canUseLegacyCheckbox =
    (await legacyCheckbox.count()) > 0 && (await legacyCheckbox.isVisible());
  const canUseLegacyLabel = (await legacyLabel.count()) > 0;

  if (canUseLegacyCheckbox || canUseLegacyLabel) {
    if (canUseLegacyCheckbox) {
      if (!(await legacyCheckbox.isChecked())) {
        await legacyCheckbox.check();
      }
    } else {
      await legacyLabel.click();
    }
    await wizard.fillTypeaheadCombobox(
      wizard.getPlacementRuleComboInRepositoryBlock(blockIndex),
      placementRuleName
    );
    return;
  }

  await enableExistingPlacementConfigurationInRepositoryBlock(wizard, blockIndex);
  const existingPlacement = placementName ?? placementRuleName;
  await wizard.fillTypeaheadCombobox(
    wizard.getExistingPlacementComboInRepositoryBlock(blockIndex),
    existingPlacement
  );
}

/** Opens edit, fixes broken PlacementRule `placementRef`, and submits. */
export async function editSubscriptionBrokenPlacementRuleRef(
  applicationListPage: ApplicationListPage,
  wizard: SubscriptionApplicationCreateWizardPage,
  options: EditSubscriptionBrokenPlacementRuleRefOptions
): Promise<void> {
  const {
    applicationName,
    namespace,
    placementRuleName,
    placementName,
    blockIndex = 0,
    entry = 'list',
    expectedUrlTimeout = 120_000,
  } = options;

  const exists = await wizard.oc.applicationsAppK8sIoExists(namespace, applicationName);
  if (!exists) {
    throw new Error(
      `editSubscriptionBrokenPlacementRuleRef: Application "${applicationName}" does not exist in namespace "${namespace}".`
    );
  }

  if (entry === 'details') {
    await wizard.openEditFromApplicationDetails(namespace, applicationName);
  } else {
    await wizard.openEditFromApplicationsList(applicationListPage, applicationName);
  }

  await wizard.expectOnEditSubscriptionUrl(namespace, applicationName, {
    timeout: expectedUrlTimeout,
  });
  await wizard.collapseYamlEditor();

  await fillBrokenPlacementRuleRefClusterDeployment(
    wizard,
    blockIndex,
    placementRuleName,
    placementName
  );

  const submitButton = wizard.getPrimarySubmitButton();
  await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
  await expect(submitButton).toBeEnabled({ timeout: 30_000 });
  await submitButton.click();
  await wizard.waitForLoad();
  await wizard.expectOnApplicationsListUrl({ timeout: expectedUrlTimeout });
}
