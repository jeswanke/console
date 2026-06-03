/**
 * Shared Placement **Tolerations** UI and sync-editor selectors (PlacementSection in ACM wizards).
 * Used by standalone Create placement (64216) and Policy set create (64217).
 */

export const PLACEMENT_DEFAULT_TOLERATIONS = {
  unreachableKey: 'cluster.open-cluster-management.io/unreachable',
  unavailableKey: 'cluster.open-cluster-management.io/unavailable',
  defaultOperator: 'Exists',
} as const;

export const PLACEMENT_SYNC_EDITOR = {
  yamlSwitchId: 'yaml-switch',
  syncEditorContainerSelector: '.sync-editor__container',
  syncEditorTextareaSelector: '.sync-editor__container textarea',
  syncEditorCopyButtonId: 'copy-button',
} as const;

export const PLACEMENT_TOLERATIONS_UI = {
  sectionHeading: /^Tolerations$/i,
  addButtonLabel: /^Add toleration$/i,
  addButtonAriaLabel: 'Action',
  removeItemAriaLabel: 'Remove item',
  summaryChipPattern: (key: string) =>
    new RegExp(`${escapePlacementRegExp(key)}\\s+exists`, 'i'),
  labels: {
    key: /^Key \*$/,
    operator: /^Operator \*$/,
    value: /^Value$/,
    effect: /^Effect$/,
    tolerationSeconds: /^Toleration seconds$/,
  },
  operators: {
    exists: /^Exists$/,
    equal: /^Equal$/,
  },
  effects: {
    noSelect: /^NoSelect$/,
    preferNoSelect: /^PreferNoSelect$/,
  },
  effectPlaceholder: /Select the effect|Leave empty for all effects/i,
} as const;

/** YAML fragment patterns for toleration edits (Placement doc within sync editor). */
export const PLACEMENT_TOLERATIONS_YAML_PATTERNS = {
  unreachableEdited:
    /cluster\.open-cluster-management\.io\/unreachable[\s\S]*operator:\s*Equal[\s\S]*value:\s*['"]?true['"]?[\s\S]*effect:\s*NoSelect[\s\S]*tolerationSeconds:\s*300/,
  customToleration:
    /custom-taint-key[\s\S]*operator:\s*Exists[\s\S]*effect:\s*PreferNoSelect/,
} as const;

function escapePlacementRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
