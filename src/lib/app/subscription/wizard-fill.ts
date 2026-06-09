/**
 * Internal wizard fill helpers for subscription create/edit flows.
 */
import { type Locator } from '@playwright/test';
import {
  APP_SUBSCRIPTION_CREATE_WIZARD,
  type SubscriptionWizardRepositoryCardKind,
} from '@constants/app';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';

import type {
  AutomationSpec,
  ClusterDeploymentSpec,
  GitSubscriptionRepositoryFields,
  HelmSubscriptionRepositoryFields,
  ObjectStorageSubscriptionRepositoryFields,
  PerBlockSubscriptionSpec,
  SubscriptionRepositorySpec,
  TimeWindowSpec,
} from './types';
import { enableExistingPlacementConfigurationInRepositoryBlock } from './placement-wizard-verify';


async function fillIfDefined(locator: Locator, value: string | undefined): Promise<void> {
  if (value === undefined) return;
  await locator.fill(value);
}

async function setCheckboxIfDefined(locator: Locator, checked: boolean | undefined): Promise<void> {
  if (checked === undefined) return;
  const box = locator.first();
  // Placement UI hides some checkboxes depending on mode (e.g. label selector vs local-only).
  // Unchecking false must not wait on a non-existent control — avoids Playwright timeout.
  const visible = await box.isVisible().catch(() => false);
  if (!visible) {
    if (checked === false) return;
    await box.waitFor({ state: 'visible', timeout: 30_000 });
  }
  await box.setChecked(checked);
}

async function fillGitRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: GitSubscriptionRepositoryFields
): Promise<void> {
  await wizard.fillTypeaheadCombobox(
    wizard.getGitRepositoryUrlInputInRepositoryBlock(blockIndex),
    spec.url
  );
  await wizard.fillTypeaheadCombobox(
    wizard.getGitBranchInputInRepositoryBlock(blockIndex),
    spec.branch ?? 'main'
  );
  await fillIfDefined(wizard.getGitUsernameInputInRepositoryBlock(blockIndex), spec.username);
  await fillIfDefined(wizard.getGitPasswordOrTokenInputInRepositoryBlock(blockIndex), spec.token);
  await fillIfDefined(wizard.getGitPathInputInRepositoryBlock(blockIndex), spec.path);
  await fillIfDefined(wizard.getGitDesiredCommitInputInRepositoryBlock(blockIndex), spec.desiredCommit);
  await fillIfDefined(wizard.getGitTagInputInRepositoryBlock(blockIndex), spec.tag);
  await fillIfDefined(wizard.getGitReconcileOptionInputInRepositoryBlock(blockIndex), spec.reconcileOption);
  await fillIfDefined(wizard.getGitReconcileRateInputInRepositoryBlock(blockIndex), spec.reconcileRate);
  await setCheckboxIfDefined(
    wizard.getGitDisableAutoReconcileCheckboxInRepositoryBlock(blockIndex),
    spec.disableAutoReconcile
  );
  await setCheckboxIfDefined(
    wizard.getGitInsecureSkipVerifyCheckboxInRepositoryBlock(blockIndex),
    spec.insecureSkipVerify
  );
}

async function fillHelmRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: HelmSubscriptionRepositoryFields
): Promise<void> {
  await wizard.fillTypeaheadCombobox(
    wizard.getHelmRepositoryUrlInputInRepositoryBlock(blockIndex),
    spec.url
  );
  await fillIfDefined(wizard.getHelmUsernameInputInRepositoryBlock(blockIndex), spec.username);
  await fillIfDefined(wizard.getHelmPasswordInputInRepositoryBlock(blockIndex), spec.password);
  await fillIfDefined(wizard.getHelmChartNameInputInRepositoryBlock(blockIndex), spec.chartName);
  await fillIfDefined(wizard.getHelmPackageAliasInputInRepositoryBlock(blockIndex), spec.packageAlias);
  await fillIfDefined(wizard.getHelmPackageVersionInputInRepositoryBlock(blockIndex), spec.packageVersion);
  await fillIfDefined(wizard.getHelmReconcileRateInputInRepositoryBlock(blockIndex), spec.reconcileRate);
  await setCheckboxIfDefined(
    wizard.getHelmInsecureSkipVerifyCheckboxInRepositoryBlock(blockIndex),
    spec.insecureSkipVerify
  );
  await setCheckboxIfDefined(
    wizard.getHelmDisableAutoReconcileCheckboxInRepositoryBlock(blockIndex),
    spec.disableAutoReconcile
  );
}

async function fillObjectStorageRepositoryBlock(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: ObjectStorageSubscriptionRepositoryFields
): Promise<void> {
  await wizard.fillTypeaheadCombobox(
    wizard.getObjectStoreUrlInputInRepositoryBlock(blockIndex),
    spec.url
  );
  await fillIfDefined(wizard.getObjectStoreAccessKeyInputInRepositoryBlock(blockIndex), spec.accessKey);
  await fillIfDefined(wizard.getObjectStoreSecretKeyInputInRepositoryBlock(blockIndex), spec.secretKey);
  await fillIfDefined(wizard.getObjectStoreRegionInputInRepositoryBlock(blockIndex), spec.region);
  await fillIfDefined(wizard.getObjectStoreSubfolderInputInRepositoryBlock(blockIndex), spec.subfolder);
}

async function fillClusterDeployment(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: ClusterDeploymentSpec
): Promise<void> {
  await wizard.expandClusterDeploymentSectionForRepositoryBlock(blockIndex);

  if (spec.useExistingPlacementRule === true) {
    await enableExistingPlacementConfigurationInRepositoryBlock(wizard, blockIndex);
    await fillIfDefined(
      wizard.getExistingPlacementComboInRepositoryBlock(blockIndex),
      spec.placementRuleComboText
    );
  } else if (spec.useExistingPlacementRule === false) {
    await setCheckboxIfDefined(
      wizard.getExistingPlacementRuleCheckboxInRepositoryBlock(blockIndex),
      false
    );
  }

  // Local/online-only checkboxes are not shown when label-selector placement is selected (PF6 hub).
  if (spec.useClusterLabelSelector !== true) {
    await setCheckboxIfDefined(
      wizard.getLocalClusterOnlyCheckboxForRepositoryBlock(blockIndex),
      spec.localClusterOnly
    );
    await setCheckboxIfDefined(
      wizard.getOnlineClustersOnlyCheckboxForRepositoryBlock(blockIndex),
      spec.onlineClustersOnly
    );
  }

  // Label placement is a PF Radio (`creation.app.settings.clusterSelector`); never use setChecked(false).
  if (spec.useClusterLabelSelector === true) {
    await wizard.clickClusterPlacementLabelSelectorRadio(blockIndex);
  }

  if (spec.useClusterLabelSelector) {
    if (spec.clusterSet !== undefined && spec.clusterSet !== '') {
      await wizard.pickClusterSetMenuOptionForRepositoryBlock(blockIndex, spec.clusterSet);
    }
    const rows = spec.labelSelectorRows ?? [];
    for (let r = 0; r < rows.length; r++) {
      if (r > 0) {
        await wizard.getClusterPlacementAddAnotherLabelButtonForRepositoryBlock(blockIndex).click();
        await wizard.waitForLoad();
      }
      const row = rows[r]!;
      if (row.labelName !== undefined) {
        await wizard.pickClusterPlacementLabelNameMenuForRepositoryBlockRow(blockIndex, r, row.labelName);
      }
      await fillIfDefined(
        wizard.getClusterPlacementLabelOperatorComboboxForRowInRepositoryBlock(blockIndex, r),
        row.labelOperator
      );
      if (row.labelValues !== undefined && row.labelValues.length > 0) {
        await wizard.pickClusterPlacementLabelValuesMenuForRepositoryBlockRow(
          blockIndex,
          r,
          row.labelValues
        );
      } else if (row.labelValue !== undefined) {
        await wizard.pickClusterPlacementLabelValueMenuForRepositoryBlockRow(
          blockIndex,
          r,
          row.labelValue
        );
      }
    }
  }
  await wizard.waitForLoad();
}

async function fillTimeWindow(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: TimeWindowSpec
): Promise<void> {
  await wizard.expandSettingsSectionForRepositoryBlock(blockIndex);
  if (spec.mode === 'default') {
    await wizard.getTimeWindowDefaultModeRadioForBlock(blockIndex).click();
    await wizard.waitForLoad();
    return;
  }
  if (spec.mode === 'active') {
    await wizard.getTimeWindowActiveModeRadioForBlock(blockIndex).click();
  } else if (spec.mode === 'blocked') {
    await wizard.getTimeWindowBlockedModeRadioForBlock(blockIndex).click();
  }
  // Mode selection expands the time-window accordion and enables the timezone control (`isDisabled={!mode}`).
  if (spec.timezone !== undefined) {
    await wizard.pickTimeWindowTimezoneMenuOptionForRepositoryBlock(blockIndex, spec.timezone);
  }
  if (spec.weekdays) {
    for (const [day, checked] of Object.entries(spec.weekdays)) {
      if (checked === undefined) continue;
      await wizard.getTimeWindowDayCheckbox(day, blockIndex).setChecked(!!checked);
    }
  }
  const ranges = spec.ranges ?? [];
  for (let i = 0; i < ranges.length; i++) {
    if (i > 0) {
      await wizard.getTimeWindowAddAnotherTimeRangeButton(blockIndex).click();
      await wizard.waitForLoad();
    }
    const range = ranges[i]!;
    await wizard.getTimeWindowStartTimeInput(i, blockIndex).fill(range.start);
    await wizard.getTimeWindowEndTimeInput(i, blockIndex).fill(range.end);
  }
  const extra = spec.extraTimeRangeRows ?? 0;
  for (let k = 0; k < extra; k++) {
    await wizard.getTimeWindowAddAnotherTimeRangeButton(blockIndex).click();
    await wizard.waitForLoad();
  }
  await wizard.waitForLoad();
}

async function fillAutomation(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: AutomationSpec
): Promise<void> {
  await wizard.expandConfigurePrePostAutomationSectionForRepositoryBlock(blockIndex);
  const block = wizard.getRepositoryBlockContainer(blockIndex);
  if (spec.credentialTypeFilter !== undefined) {
    await wizard
      .getAnsibleCredentialTypeFilterComboboxInRepositoryBlock(blockIndex)
      .fill(spec.credentialTypeFilter);
  }
  if (spec.existingAnsibleSecret !== undefined) {
    await block
      .getByPlaceholder(APP_SUBSCRIPTION_CREATE_WIZARD.automation.existingSecretPlaceholder)
      .fill(spec.existingAnsibleSecret);
  }
  await wizard.waitForLoad();
}

export async function applyPerBlockOptions(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  extras: PerBlockSubscriptionSpec | undefined
): Promise<void> {
  if (!extras) return;
  if (extras.clusterDeployment) {
    await fillClusterDeployment(wizard, blockIndex, extras.clusterDeployment);
  }
  if (extras.timeWindow) {
    await fillTimeWindow(wizard, blockIndex, extras.timeWindow);
  }
  if (extras.automation) {
    await fillAutomation(wizard, blockIndex, extras.automation);
  }
}

export async function fillRepositoryBlockBySpec(
  wizard: SubscriptionApplicationCreateWizardPage,
  blockIndex: number,
  spec: SubscriptionRepositorySpec
): Promise<void> {
  await wizard.expandRepositoryTypesSectionForRepositoryBlock(blockIndex);
  await wizard.selectRepositoryTypeInBlock(blockIndex, spec.kind as SubscriptionWizardRepositoryCardKind);

  if (spec.kind === 'git') {
    await fillGitRepositoryBlock(wizard, blockIndex, spec);
  } else if (spec.kind === 'helm') {
    await fillHelmRepositoryBlock(wizard, blockIndex, spec);
  } else {
    await fillObjectStorageRepositoryBlock(wizard, blockIndex, spec);
  }

  await wizard.waitForLoad();
}
