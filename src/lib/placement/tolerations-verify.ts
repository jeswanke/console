/**
 * Shared Placement **Tolerations** assertions (form + YAML fragments) for any wizard hosting PlacementSection.
 */
import { expect, type Locator } from '@playwright/test';

import {
  PLACEMENT_DEFAULT_TOLERATIONS,
  PLACEMENT_TOLERATIONS_UI,
  PLACEMENT_TOLERATIONS_YAML_PATTERNS,
} from '@constants/placement-tolerations';
import { getPlacementTolerations } from '@lib/placement/placement-yaml';
import type { PlacementTolerationsActions } from '@lib/placement/tolerations-actions';
import type { SyncEditorYamlActions } from '@lib/placement/sync-editor-actions';

export type PlacementTolerationsWizardHost = {
  tolerations: PlacementTolerationsActions;
  syncEditor: SyncEditorYamlActions;
};

export async function verifyDefaultTolerationSummaryChipsVisible(
  host: PlacementTolerationsWizardHost
): Promise<void> {
  const { tolerations } = host;
  await tolerations.scrollToTolerationsSection();
  await expect(
    tolerations.getTolerationSummaryChip(PLACEMENT_DEFAULT_TOLERATIONS.unreachableKey)
  ).toBeVisible();
  await expect(
    tolerations.getTolerationSummaryChip(PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey)
  ).toBeVisible();
}

export async function verifyDefaultTolerationFieldsWhenExpanded(
  host: PlacementTolerationsWizardHost,
  key: string
): Promise<void> {
  const { tolerations } = host;
  const group = tolerations.getTolerationFieldGroupByKey(key);
  await tolerations.expandTolerationFieldGroup(group);
  await expect(group.getByLabel(PLACEMENT_TOLERATIONS_UI.labels.key)).toHaveValue(key);
  await expect(
    group.getByRole('button', { name: PLACEMENT_TOLERATIONS_UI.operators.exists })
  ).toBeVisible();
  await expect(
    group.getByRole('combobox', { name: PLACEMENT_TOLERATIONS_UI.effectPlaceholder })
  ).toBeVisible();
  await expect(tolerations.getTolerationSecondsInput(group)).toHaveValue('');
}

export async function editUnreachableTolerationInForm(
  host: PlacementTolerationsWizardHost
): Promise<void> {
  const { tolerations } = host;
  const group = tolerations.getTolerationFieldGroupByKey(
    PLACEMENT_DEFAULT_TOLERATIONS.unreachableKey
  );
  await tolerations.expandTolerationFieldGroup(group);
  await tolerations.selectTolerationOperator(group, 'equal');
  await expect(group.getByLabel(PLACEMENT_TOLERATIONS_UI.labels.value)).toBeVisible();
  await tolerations.fillTolerationValue(group, 'true');
  await tolerations.selectTolerationEffect(group, 'noSelect');
  await tolerations.fillTolerationSeconds(group, '300');
  await expect(tolerations.getTolerationSecondsInput(group)).toHaveValue('300');
}

export async function verifyUnreachableTolerationUpdatedInUi(
  host: PlacementTolerationsWizardHost
): Promise<void> {
  const { tolerations } = host;
  const group = tolerations.getTolerationFieldGroupByKey(
    PLACEMENT_DEFAULT_TOLERATIONS.unreachableKey
  );
  await expect(
    group.getByRole('button', { name: PLACEMENT_TOLERATIONS_UI.operators.equal })
  ).toBeVisible();
  await expect(group.getByLabel(PLACEMENT_TOLERATIONS_UI.labels.value)).toHaveValue('true');
  await expect(
    group.getByText(PLACEMENT_TOLERATIONS_UI.effects.noSelect, { exact: true })
  ).toBeVisible();
  await expect(tolerations.getTolerationSecondsInput(group)).toHaveValue('300');
}

export async function verifyUnreachableTolerationUpdatedInYaml(
  host: PlacementTolerationsWizardHost
): Promise<void> {
  const yamlText = await host.syncEditor.readYaml({
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
}

export async function deleteUnavailableTolerationInForm(
  host: PlacementTolerationsWizardHost
): Promise<void> {
  const group = host.tolerations.getTolerationFieldGroupByKey(
    PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey
  );
  await host.tolerations.removeTolerationFieldGroup(group);
}

export async function verifyUnavailableTolerationRemovedFromUi(
  host: PlacementTolerationsWizardHost
): Promise<void> {
  const { tolerations } = host;
  await expect(
    tolerations.getTolerationSummaryChip(PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey)
  ).toHaveCount(0);
  await expect(
    tolerations.getTolerationFieldGroupByKey(PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey)
  ).toHaveCount(0);
}

export async function verifyUnavailableTolerationRemovedFromYaml(
  host: PlacementTolerationsWizardHost
): Promise<void> {
  await expect
    .poll(async () => host.syncEditor.copyYaml(), { timeout: 45_000 })
    .not.toContain(PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey);
}

export async function addCustomTolerationInForm(
  host: PlacementTolerationsWizardHost
): Promise<Locator> {
  const { tolerations } = host;
  await tolerations.clickAddToleration();
  const group = tolerations.getLastTolerationFieldGroup();
  await tolerations.expandTolerationFieldGroup(group);
  await group.getByLabel(PLACEMENT_TOLERATIONS_UI.labels.key).fill('custom-taint-key');
  await tolerations.selectTolerationEffect(group, 'preferNoSelect');
  return group;
}

export async function verifyCustomTolerationInYaml(
  host: PlacementTolerationsWizardHost
): Promise<void> {
  const yamlText = await host.syncEditor.readYaml({
    waitPattern: PLACEMENT_TOLERATIONS_YAML_PATTERNS.customToleration,
    timeoutMs: 45_000,
  });
  expect(getPlacementTolerations(yamlText)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        key: 'custom-taint-key',
        operator: PLACEMENT_DEFAULT_TOLERATIONS.defaultOperator,
        effect: 'PreferNoSelect',
      }),
    ])
  );
}
