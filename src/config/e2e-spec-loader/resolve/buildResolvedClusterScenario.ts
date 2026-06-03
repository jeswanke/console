import { resolvePlacementDomain } from '../domains/placement/resolvePlacementDomain';
import type { E2eSpecData } from '../schema';
import type { ResolvedClusterScenario } from '../types/cluster';
import { collectScenarioTestIds } from './collectScenarioTestIds';

export function buildResolvedClusterScenario(
  spec: E2eSpecData,
  scenarioId: string
): ResolvedClusterScenario {
  const scenarioBody = spec.scenarios[scenarioId];
  if (!scenarioBody) {
    throw new Error(`e2e-spec-data: unknown scenario "${scenarioId}"`);
  }
  if (scenarioBody.enabled === false) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" is disabled`);
  }

  const placement = resolvePlacementDomain(spec, scenarioId, scenarioBody);
  if (!placement) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" has no placement domain payload`);
  }

  return {
    scenarioId,
    enabled: true,
    testIds: collectScenarioTestIds(spec, scenarioId),
    domain: 'placement',
    placement,
  };
}
