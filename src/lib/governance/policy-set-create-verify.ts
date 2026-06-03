/**
 * **Create policy set** wizard — Placement step tolerations (RHACM4K-64217).
 */
import { expect } from '@playwright/test';

import { POLICY_SET_CREATE_WIZARD } from '@constants/governance';
import { PLACEMENT_DEFAULT_TOLERATIONS } from '@constants/placement-tolerations';
import type { CreatePolicySetWizardPage } from '@pages/governance/CreatePolicySetWizardPage';
import {
  getPlacementTolerations,
  parsePlacementFromSyncYaml,
  syncYamlContainsKind,
} from '@lib/placement/placement-yaml';

export {
  verifyDefaultTolerationSummaryChipsVisible,
  verifyDefaultTolerationFieldsWhenExpanded,
  editUnreachableTolerationInForm,
  verifyUnreachableTolerationUpdatedInUi,
  verifyUnreachableTolerationUpdatedInYaml,
  deleteUnavailableTolerationInForm,
  verifyUnavailableTolerationRemovedFromUi,
  verifyUnavailableTolerationRemovedFromYaml,
  addCustomTolerationInForm,
  verifyCustomTolerationInYaml,
} from '@lib/placement/tolerations-verify';

export async function verifyCreatePolicySetWizardTitle(
  wizard: CreatePolicySetWizardPage
): Promise<void> {
  await expect(wizard.getPageTitle()).toBeVisible();
}

export async function verifyDefaultPolicySetPlacementTolerationsInYaml(
  wizard: CreatePolicySetWizardPage
): Promise<void> {
  await wizard.syncEditor.enableYamlEditor();
  const yamlText = await wizard.syncEditor.waitForYamlMatching(
    POLICY_SET_CREATE_WIZARD.yamlPatterns.defaultTolerationsSynced,
    60_000
  );

  expect(syncYamlContainsKind(yamlText, 'PolicySet')).toBe(true);
  expect(syncYamlContainsKind(yamlText, 'Placement')).toBe(true);
  expect(syncYamlContainsKind(yamlText, 'PlacementBinding')).toBe(true);
  expect(yamlText).not.toMatch(/numberOfClusters:/);

  const placement = parsePlacementFromSyncYaml(yamlText);
  expect(placement, 'Placement resource in multi-doc YAML').toBeDefined();
  const tolerations = placement?.spec?.tolerations ?? [];
  expect(tolerations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        key: PLACEMENT_DEFAULT_TOLERATIONS.unreachableKey,
        operator: PLACEMENT_DEFAULT_TOLERATIONS.defaultOperator,
      }),
      expect.objectContaining({
        key: PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey,
        operator: PLACEMENT_DEFAULT_TOLERATIONS.defaultOperator,
      }),
    ])
  );
  expect(placement?.spec?.numberOfClusters).toBeUndefined();
}

export async function verifyUnreachableTolerationUpdatedInPolicySetYaml(
  wizard: CreatePolicySetWizardPage
): Promise<void> {
  const yamlText = await wizard.syncEditor.readYaml({
    waitPattern: POLICY_SET_CREATE_WIZARD.yamlPatterns.unreachableEdited,
    timeoutMs: 45_000,
  });
  const unreachable = getPlacementTolerations(yamlText).find(
    (t) => t.key === PLACEMENT_DEFAULT_TOLERATIONS.unreachableKey
  );
  expect(unreachable).toMatchObject({
    operator: 'Equal',
    value: 'true',
    effect: 'NoSelect',
    tolerationSeconds: 300,
  });
  expect(yamlText).toContain(PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey);
  expect(syncYamlContainsKind(yamlText, 'PolicySet')).toBe(true);
}
