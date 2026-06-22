/**
 * RHACM4K-61724: Argo CD ApplicationSet create wizards (pull + push) — Placement tolerations.
 */
import { expect, type Locator } from '@playwright/test';

import {
  APP_ARGO_PULL_CREATE_WIZARD,
  APP_ARGO_PUSH_CREATE_WIZARD,
} from '@constants/app';
import {
  PLACEMENT_DEFAULT_TOLERATIONS,
  PLACEMENT_TOLERATIONS_YAML_PATTERNS,
} from '@constants/placement-tolerations';
import {
  getPlacementTolerations,
  parsePlacementFromSyncYaml,
  syncYamlContainsKind,
} from '@lib/placement/placement-yaml';
import type { PlacementTolerationsWizardHost } from '@lib/placement/tolerations-verify';
import {
  addCustomTolerationInForm,
  deleteUnavailableTolerationInForm,
  editUnreachableTolerationInForm,
  verifyCustomTolerationInYaml,
  verifyDefaultTolerationFieldsWhenExpanded,
  verifyDefaultTolerationSummaryChipsVisible,
  verifyUnavailableTolerationRemovedFromUi,
  verifyUnavailableTolerationRemovedFromYaml,
  verifyUnreachableTolerationUpdatedInUi,
} from '@lib/placement/tolerations-verify';
import type { SyncEditorYamlActions } from '@lib/placement/sync-editor-actions';

export {
  verifyDefaultTolerationSummaryChipsVisible,
  verifyDefaultTolerationFieldsWhenExpanded,
  editUnreachableTolerationInForm,
  verifyUnreachableTolerationUpdatedInUi,
  deleteUnavailableTolerationInForm,
  verifyUnavailableTolerationRemovedFromUi,
  verifyUnavailableTolerationRemovedFromYaml,
  addCustomTolerationInForm,
  verifyCustomTolerationInYaml,
  verifyUnreachableTolerationUpdatedInYaml,
} from '@lib/placement/tolerations-verify';

export type ArgoPlacementTolerationsYamlPatterns = {
  modalGitOpsPlacementTolerations: RegExp;
  wizardApplicationSetPlacementTolerations: RegExp;
};

export type ArgoPlacementTolerationsWizardHost = PlacementTolerationsWizardHost & {
  getAddArgoServerModal(): Locator;
  getModalSyncEditor(): SyncEditorYamlActions;
  openAddArgoServerModal(): Promise<void>;
  closeAddArgoServerModal(): Promise<void>;
  clickWizardStep(step: 'placement'): Promise<void>;
};

export async function verifyAddArgoServerModalHasNoTolerationsForm(
  wizard: ArgoPlacementTolerationsWizardHost
): Promise<void> {
  const modal = wizard.getAddArgoServerModal();
  await expect(modal.getByText(/^Tolerations$/i)).toHaveCount(0);
  await expect(
    modal.getByRole('button', { name: /Add toleration/i }).or(modal.getByText(/Add toleration/i))
  ).toHaveCount(0);
}

export async function verifyAddArgoServerModalPlacementTolerationsInYaml(
  wizard: ArgoPlacementTolerationsWizardHost,
  patterns: ArgoPlacementTolerationsYamlPatterns
): Promise<void> {
  const yamlText = await wizard.getModalSyncEditor().waitForYamlMatching(
    patterns.modalGitOpsPlacementTolerations,
    60_000
  );

  expect(syncYamlContainsKind(yamlText, 'GitOpsCluster')).toBe(true);
  expect(syncYamlContainsKind(yamlText, 'Placement')).toBe(true);

  const placement = parsePlacementFromSyncYaml(yamlText);
  expect(placement, 'Placement in Add Argo server modal YAML').toBeDefined();
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
  expect(placement?.spec?.clusterSets).toEqual(expect.arrayContaining(['default']));
}

export async function verifyDefaultArgoPlacementTolerationsInYaml(
  wizard: ArgoPlacementTolerationsWizardHost,
  patterns: ArgoPlacementTolerationsYamlPatterns
): Promise<void> {
  const yamlText = await wizard.syncEditor.waitForYamlMatching(
    patterns.wizardApplicationSetPlacementTolerations,
    60_000
  );

  expect(syncYamlContainsKind(yamlText, 'ApplicationSet')).toBe(true);
  expect(syncYamlContainsKind(yamlText, 'Placement')).toBe(true);

  const placement = parsePlacementFromSyncYaml(yamlText);
  expect(placement, 'Placement resource in wizard YAML').toBeDefined();
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
  // Limit checkbox is off by default; numberOfClusters is omitted until the user enables it.
  expect(placement?.spec?.numberOfClusters).toBeUndefined();
  expect(yamlText).not.toMatch(/numberOfClusters:/);
}

export async function verifyUnreachableTolerationUpdatedInArgoYaml(
  wizard: ArgoPlacementTolerationsWizardHost
): Promise<void> {
  const yamlText = await wizard.syncEditor.readYaml({
    waitPattern: PLACEMENT_TOLERATIONS_YAML_PATTERNS.unreachableEdited,
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
  expect(syncYamlContainsKind(yamlText, 'ApplicationSet')).toBe(true);
}

/** RHACM4K-61724: full tolerations flow on pull or push create wizard (Add server modal → Placement step). */
export async function runArgoPlacementTolerationsFlow(
  wizard: ArgoPlacementTolerationsWizardHost,
  yamlPatterns: ArgoPlacementTolerationsYamlPatterns
): Promise<void> {
  await wizard.openAddArgoServerModal();
  await verifyAddArgoServerModalHasNoTolerationsForm(wizard);
  await verifyAddArgoServerModalPlacementTolerationsInYaml(wizard, yamlPatterns);
  await wizard.closeAddArgoServerModal();

  await wizard.clickWizardStep('placement');
  await wizard.tolerations.scrollToTolerationsSection();

  await verifyDefaultTolerationSummaryChipsVisible(wizard);
  await verifyDefaultTolerationFieldsWhenExpanded(
    wizard,
    PLACEMENT_DEFAULT_TOLERATIONS.unreachableKey
  );
  await verifyDefaultTolerationFieldsWhenExpanded(
    wizard,
    PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey
  );

  await wizard.syncEditor.enableYamlEditor();
  await verifyDefaultArgoPlacementTolerationsInYaml(wizard, yamlPatterns);

  await editUnreachableTolerationInForm(wizard);
  await verifyUnreachableTolerationUpdatedInUi(wizard);
  await verifyUnreachableTolerationUpdatedInArgoYaml(wizard);

  await deleteUnavailableTolerationInForm(wizard);
  await verifyUnavailableTolerationRemovedFromUi(wizard);
  await verifyUnavailableTolerationRemovedFromYaml(wizard);

  await addCustomTolerationInForm(wizard);
  await verifyCustomTolerationInYaml(wizard);
}

export const ARGO_PLACEMENT_TOLERATIONS_WIZARD_YAML = {
  pull: APP_ARGO_PULL_CREATE_WIZARD.yamlPatterns,
  push: APP_ARGO_PUSH_CREATE_WIZARD.yamlPatterns,
} as const;
