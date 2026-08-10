/** ALC ansible large-scale scenario resolve API. */
import { loadE2eSpecData } from './io/loadSpec';
import { findScenarioIdsByTestId } from './lookup/findScenarioIds';
import { buildResolvedAnsibleScaleScenario } from './resolve/buildResolvedAnsibleScaleScenario';
import { resolveAnsibleScaleSuiteConfig } from './domains/ansible-scale/resolveAnsibleScaleSuite';

export type {
  AnsibleScaleFixturePayload,
  AnsibleScaleScenarioPayload,
  AnsibleScaleSuitePayload,
  AnsibleScaleSyncTiming,
} from './domains/ansible-scale/ansibleScaleSchema';
export type { ResolvedAnsibleScaleScenario } from './resolve/buildResolvedAnsibleScaleScenario';

function resolveAnsibleScaleScenarioByTestIdInternal(testId: string, configPath?: string) {
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
  return buildResolvedAnsibleScaleScenario(spec, scenarioIds[0]!);
}

function resolveAnsibleScaleScenarioByIdInternal(scenarioId: string, configPath?: string) {
  const spec = loadE2eSpecData(configPath);
  if (!spec.scenarios[scenarioId]) {
    throw new Error(`e2e-spec-data: scenario not found: "${scenarioId}"`);
  }
  return buildResolvedAnsibleScaleScenario(spec, scenarioId);
}

export function resolveAnsibleScaleScenarioByTestId(testId: string, configPath?: string) {
  return resolveAnsibleScaleScenarioByTestIdInternal(testId, configPath);
}

export function resolveAnsibleScaleScenarioById(scenarioId: string, configPath?: string) {
  return resolveAnsibleScaleScenarioByIdInternal(scenarioId, configPath);
}

export { resolveAnsibleScaleSuiteConfig };
