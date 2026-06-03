/** Cluster lifecycle (CLC) — standalone placement scenario resolve API. */
import { loadE2eSpecData } from './io/loadSpec';
import { findScenarioIdsByTestId } from './lookup/findScenarioIds';
import { buildResolvedClusterScenario } from './resolve/buildResolvedClusterScenario';
import type { ResolvedPlacementScenario } from './types/cluster';

export type { ResolvedPlacementScenario, ResolvedClusterScenario } from './types/cluster';

function resolveClusterScenarioByTestIdInternal(
  testId: string,
  configPath?: string
): ResolvedPlacementScenario {
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
  const resolved = buildResolvedClusterScenario(spec, scenarioIds[0]!);
  if (resolved.domain !== 'placement') {
    throw new Error(
      `e2e-spec-data: expected placement scenario for test id "${testId}", got "${resolved.domain}"`
    );
  }
  return resolved;
}

function resolveClusterScenarioByIdInternal(
  scenarioId: string,
  configPath?: string
): ResolvedPlacementScenario {
  const spec = loadE2eSpecData(configPath);
  if (!spec.scenarios[scenarioId]) {
    throw new Error(`e2e-spec-data: scenario not found: "${scenarioId}"`);
  }
  return buildResolvedClusterScenario(spec, scenarioId);
}

export function resolvePlacementScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedPlacementScenario {
  return resolveClusterScenarioByTestIdInternal(testId, configPath);
}

export function resolvePlacementScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedPlacementScenario {
  return resolveClusterScenarioByIdInternal(scenarioId, configPath);
}
