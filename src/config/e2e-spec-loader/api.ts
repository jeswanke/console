import { loadE2eSpecData } from './io/loadSpec';
import { findScenarioIdsByTestId } from './lookup/findScenarioIds';
import { buildResolvedAppScenario } from './resolve/buildResolvedAppScenario';
import type { ResolvedAppScenario } from './types';

export type { ResolvedAppScenario } from './types';
export { clearE2eSpecDataCache, loadE2eSpecData } from './io/loadSpec';

/**
 * Resolves a Polarion / matrix **test id** to a single application scenario.
 * @throws if zero or more than one enabled scenario matches.
 */
export function resolveScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedAppScenario {
  const spec = loadE2eSpecData(configPath);
  const scenarioIds = findScenarioIdsByTestId(spec, testId);
  if (scenarioIds.length === 0) {
    throw new Error(`e2e-spec-data: no enabled scenario for test id "${testId}"`);
  }
  if (scenarioIds.length > 1) {
    throw new Error(
      `e2e-spec-data: multiple scenarios for test id "${testId}": ${scenarioIds.join(', ')}`
    );
  }
  return buildResolvedAppScenario(spec, scenarioIds[0]!);
}

/** Resolves a YAML **scenario id** (e.g. `auto_git_add_subscription_base`). */
export function resolveScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedAppScenario {
  const spec = loadE2eSpecData(configPath);
  if (!spec.scenarios[scenarioId]) {
    throw new Error(`e2e-spec-data: scenario not found: "${scenarioId}"`);
  }
  return buildResolvedAppScenario(spec, scenarioId);
}

/** Base scenario by id + delta scenario by Polarion test id (add/edit flows). */
export function resolveScenarioPair(params: {
  baseScenarioId: string;
  testId: string;
  configPath?: string;
}): { base: ResolvedAppScenario; delta: ResolvedAppScenario } {
  const { baseScenarioId, testId, configPath } = params;
  return {
    base: resolveScenarioById(baseScenarioId, configPath),
    delta: resolveScenarioByTestId(testId, configPath),
  };
}
