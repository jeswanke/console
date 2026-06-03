/** Public API for specs and fixtures. */
export {
  clearE2eSpecDataCache,
  loadE2eSpecData,
  resolveScenarioById,
  resolveScenarioByTestId,
  resolveScenarioPair,
  type ResolvedAppScenario,
} from './api';

/** Low-level helpers for unit tests and domain development. */
export { findScenarioIdsByTestId } from './lookup/findScenarioIds';
export { buildResolvedAppScenario } from './resolve/buildResolvedAppScenario';
export { listE2eSpecYamlFiles, defaultSpecDataPath } from './io/loadSpec';
export { mergeApplicationExpectationsLayers } from './domains/application-expectations/applicationExpectationsMerge';
export { mergeExpectationsRowsForComposerBlock } from './domains/blocks/expandComposer';
export type { E2eSpecData, ScenarioEntry } from './schema';
