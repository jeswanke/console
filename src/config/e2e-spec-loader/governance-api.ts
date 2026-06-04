/** Governance (GRC) — policy and policy set scenario resolve API. */
import { loadE2eSpecData } from './io/loadSpec';
import { findScenarioIdsByTestId } from './lookup/findScenarioIds';
import { buildResolvedGovernanceScenario } from './resolve/buildResolvedGovernanceScenario';
import type {
  ResolvedGovernanceScenario,
  ResolvedPolicyScenario,
  ResolvedPolicySetScenario,
} from './types/governance';

export type {
  ResolvedGovernanceScenario,
  ResolvedPolicyScenario,
  ResolvedPolicySetScenario,
} from './types/governance';
export type { PlacementPreviewSetupPayload } from './domains/placement-preview/placementPreviewSchema';

function requirePolicyScenario(
  resolved: ResolvedGovernanceScenario,
  context: string
): ResolvedPolicyScenario {
  if (resolved.domain !== 'policy') {
    throw new Error(`e2e-spec-data: expected policy scenario for ${context}, got "${resolved.domain}"`);
  }
  return resolved;
}

function requirePolicySetScenario(
  resolved: ResolvedGovernanceScenario,
  context: string
): ResolvedPolicySetScenario {
  if (resolved.domain !== 'policySet') {
    throw new Error(
      `e2e-spec-data: expected policySet scenario for ${context}, got "${resolved.domain}"`
    );
  }
  return resolved;
}

function resolveGovernanceScenarioByTestIdInternal(
  testId: string,
  configPath?: string
): ResolvedGovernanceScenario {
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
  return buildResolvedGovernanceScenario(spec, scenarioIds[0]!);
}

function resolveGovernanceScenarioByIdInternal(
  scenarioId: string,
  configPath?: string
): ResolvedGovernanceScenario {
  const spec = loadE2eSpecData(configPath);
  if (!spec.scenarios[scenarioId]) {
    throw new Error(`e2e-spec-data: scenario not found: "${scenarioId}"`);
  }
  return buildResolvedGovernanceScenario(spec, scenarioId);
}

export function resolvePolicyScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedPolicyScenario {
  return requirePolicyScenario(
    resolveGovernanceScenarioByTestIdInternal(testId, configPath),
    `test id "${testId}"`
  );
}

export function resolvePolicyScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedPolicyScenario {
  return requirePolicyScenario(
    resolveGovernanceScenarioByIdInternal(scenarioId, configPath),
    `scenario id "${scenarioId}"`
  );
}

export function resolvePolicySetScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedPolicySetScenario {
  return requirePolicySetScenario(
    resolveGovernanceScenarioByTestIdInternal(testId, configPath),
    `test id "${testId}"`
  );
}

export function resolvePolicySetScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedPolicySetScenario {
  return requirePolicySetScenario(
    resolveGovernanceScenarioByIdInternal(scenarioId, configPath),
    `scenario id "${scenarioId}"`
  );
}
