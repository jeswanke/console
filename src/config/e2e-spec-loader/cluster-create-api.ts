/** Cluster creation — resolve scenarios for create-cluster tests. */
import { loadE2eSpecData } from './io/loadSpec';
import { findScenarioIdsByTestId } from './lookup/findScenarioIds';
import {
  resolveClusterCreateCredential,
  resolveClusterCreateParams,
} from './domains/cluster-create/resolveClusterCreateDomain';
import type { ResolvedClusterCreateScenario } from './domains/cluster-create/clusterCreateSchema';
import { collectScenarioTestIds } from './resolve/collectScenarioTestIds';

export type { ResolvedClusterCreateScenario } from './domains/cluster-create/clusterCreateSchema';
export type {
  ClusterCreateCredentialPayload,
  ClusterCreateParamsPayload,
} from './domains/cluster-create/clusterCreateSchema';

function resolveInternal(scenarioId: string, configPath?: string): ResolvedClusterCreateScenario {
  const spec = loadE2eSpecData(configPath);
  const scenarioBody = spec.scenarios[scenarioId];
  if (!scenarioBody) {
    throw new Error(`e2e-spec-data: scenario not found: "${scenarioId}"`);
  }
  if (scenarioBody.enabled === false) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" is disabled`);
  }

  const credential = resolveClusterCreateCredential(spec, scenarioId, scenarioBody);
  if (!credential) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" has no credential domain payload`);
  }

  const cluster = resolveClusterCreateParams(spec, scenarioId, scenarioBody);
  if (!cluster) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" has no cluster domain payload`);
  }

  return {
    scenarioId,
    enabled: true,
    testIds: collectScenarioTestIds(spec, scenarioId),
    domain: 'clusterCreate',
    credential,
    cluster,
  };
}

export function resolveClusterCreateScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedClusterCreateScenario {
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
  return resolveInternal(scenarioIds[0]!, configPath);
}

export function resolveClusterCreateScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedClusterCreateScenario {
  return resolveInternal(scenarioId, configPath);
}

export function resolveEnabledClusterCreateScenarios(
  configPath?: string
): ResolvedClusterCreateScenario[] {
  const spec = loadE2eSpecData(configPath);
  return Object.entries(spec.scenarios)
    .filter(([, entry]) => entry.enabled !== false)
    .map(([id]) => {
      try {
        return resolveInternal(id, configPath);
      } catch (e) {
        console.warn(`e2e-spec-data: skipping scenario "${id}":`, (e as Error).message);
        return null;
      }
    })
    .filter((s): s is ResolvedClusterCreateScenario => s !== null);
}
