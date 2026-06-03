/** Public API for specs and fixtures. */
export {
  clearE2eSpecDataCache,
  loadE2eSpecData,
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
} from './api';

/** Low-level helpers for unit tests and domain development. */
export { findScenarioIdsByTestId } from './lookup/findScenarioIds';
export { buildResolvedAppScenario } from './resolve/buildResolvedAppScenario';
export { listE2eSpecYamlFiles, defaultSpecDataPath } from './io/loadSpec';
export { mergeApplicationExpectationsLayers } from './domains/application-expectations/applicationExpectationsMerge';
export { mergeArgoPushLayers } from './domains/argo-push/argoPushMerge';
export { mergeExpectationsRowsForComposerBlock } from './domains/blocks/expandComposer';
export { resolveArgoPushDomain } from './domains/argo-push/resolveArgoPushDomain';
export type { E2eSpecData, ScenarioEntry } from './schema';
