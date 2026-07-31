/** Shared loader — merged YAML from `e2e-spec-data/` (all components). */
export {
  clearE2eSpecDataCache,
  defaultSpecDataPath,
  listE2eSpecYamlFiles,
  loadE2eSpecData,
} from './io/loadSpec';

/** Application lifecycle (ALC) — subscription / argoPush resolve API. */
export {
  resolveArgoPushScenarioById,
  resolveArgoPushScenarioByTestId,
  resolveScenarioById,
  resolveScenarioByTestId,
  resolveScenarioPair,
  resolveSubscriptionScenarioById,
  resolveSubscriptionScenarioByTestId,
  resolveSubscriptionScenarioPair,
  type ResolvedAppScenario,
  type ResolvedArgoPushAppScenario,
  type ResolvedSubscriptionAppScenario,
} from './app-api';

/** Low-level helpers for unit tests and domain development. */
export { findScenarioIdsByTestId } from './lookup/findScenarioIds';
export { buildResolvedAppScenario } from './resolve/buildResolvedAppScenario';
export { mergeApplicationExpectationsLayers } from './domains/application-expectations/applicationExpectationsMerge';
export { mergeArgoPushLayers } from './domains/argo-push/argoPushMerge';
export { mergeExpectationsRowsForComposerBlock } from './domains/blocks/expandComposer';
export { resolveArgoPushDomain } from './domains/argo-push/resolveArgoPushDomain';
export type { E2eSpecData, ScenarioEntry } from './schema';

export {
  resolvePolicyScenarioById,
  resolvePolicyScenarioByTestId,
  resolvePolicySetScenarioById,
  resolvePolicySetScenarioByTestId,
  type PlacementPreviewSetupPayload,
  type ResolvedGovernanceScenario,
  type ResolvedPolicyScenario,
  type ResolvedPolicySetScenario,
} from './governance-api';

export {
  resolvePlacementScenarioById,
  resolvePlacementScenarioByTestId,
  type ResolvedClusterScenario,
  type ResolvedPlacementScenario,
} from './cluster-api';

export {
  resolveClusterCreateScenarioById,
  resolveClusterCreateScenarioByTestId,
  resolveEnabledClusterCreateScenarios,
  type ClusterCreateCredentialPayload,
  type ClusterCreateParamsPayload,
  type ResolvedClusterCreateScenario,
} from './cluster-create-api';

export { buildResolvedGovernanceScenario } from './resolve/buildResolvedGovernanceScenario';
export { buildResolvedClusterScenario } from './resolve/buildResolvedClusterScenario';
