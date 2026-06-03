/**
 * Standalone **Create placement** wizard — default tolerations and YAML sync (RHACM4K-64216).
 */
import { expect } from '@playwright/test';

import { PLACEMENT_CREATE_WIZARD, PLACEMENT_DEFAULT_TOLERATIONS } from '@constants/placement';
import type { CreatePlacementWizardPage } from '@pages/cluster/CreatePlacementWizardPage';
import { parsePlacementFromSyncYaml } from '@lib/placement/placement-yaml';
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

export async function verifyCreatePlacementWizardTitle(
  wizard: CreatePlacementWizardPage
): Promise<void> {
  await expect(wizard.getPageTitle()).toBeVisible();
}

export async function verifyDefaultPlacementTolerationsInYaml(
  wizard: CreatePlacementWizardPage
): Promise<void> {
  await wizard.syncEditor.enableYamlEditor();
  const yamlText = await wizard.syncEditor.waitForYamlMatching(
    PLACEMENT_CREATE_WIZARD.yamlPatterns.defaultTolerationsSynced,
    60_000
  );

  const placement = parsePlacementFromSyncYaml(yamlText);
  expect(placement, 'Placement resource in YAML').toBeDefined();
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
  expect(placement?.spec?.numberOfClusters).toBe(1);
}
