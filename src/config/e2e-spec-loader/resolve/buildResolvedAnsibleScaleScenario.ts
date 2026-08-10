import { resolveAnsibleScaleDomain } from '../domains/ansible-scale/resolveAnsibleScaleDomain';
import type { AnsibleScaleScenarioPayload } from '../domains/ansible-scale/ansibleScaleSchema';
import type { E2eSpecData } from '../schema';
import { collectScenarioTestIds } from './collectScenarioTestIds';

export type ResolvedAnsibleScaleScenario = {
  scenarioId: string;
  enabled: true;
  testIds: string[];
  ansibleScale: AnsibleScaleScenarioPayload;
};

export function buildResolvedAnsibleScaleScenario(
  spec: E2eSpecData,
  scenarioId: string
): ResolvedAnsibleScaleScenario {
  const scenarioBody = spec.scenarios[scenarioId];
  if (!scenarioBody) {
    throw new Error(`e2e-spec-data: unknown scenario "${scenarioId}"`);
  }
  if (scenarioBody.enabled === false) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" is disabled`);
  }

  const ansibleScale = resolveAnsibleScaleDomain(spec, scenarioId, scenarioBody);
  if (!ansibleScale) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" has no ansibleScale domain payload`);
  }

  return {
    scenarioId,
    enabled: true,
    testIds: collectScenarioTestIds(spec, scenarioId),
    ansibleScale,
  };
}
