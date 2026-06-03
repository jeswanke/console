import { resolvePolicyDomain } from '../domains/policy/resolvePolicyDomain';
import { resolvePolicySetDomain } from '../domains/policySet/resolvePolicySetDomain';
import type { PlacementPreviewSetupPayload } from '../domains/placement-preview/placementPreviewSchema';
import type { E2eSpecData } from '../schema';
import type { ResolvedGovernanceScenario } from '../types/governance';
import { collectScenarioTestIds } from './collectScenarioTestIds';

export function buildResolvedGovernanceScenario(
  spec: E2eSpecData,
  scenarioId: string
): ResolvedGovernanceScenario {
  const scenarioBody = spec.scenarios[scenarioId];
  if (!scenarioBody) {
    throw new Error(`e2e-spec-data: unknown scenario "${scenarioId}"`);
  }
  if (scenarioBody.enabled === false) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" is disabled`);
  }

  const policy = resolvePolicyDomain(spec, scenarioId, scenarioBody);
  const policySet = resolvePolicySetDomain(spec, scenarioId, scenarioBody);
  const hasPolicy = policy !== undefined;
  const hasPolicySet = policySet !== undefined;

  if (hasPolicy && hasPolicySet) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" must not define both policy and policySet domains`
    );
  }
  if (!hasPolicy && !hasPolicySet) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" has no policy or policySet domain payload`
    );
  }

  const base = {
    scenarioId,
    enabled: true as const,
    testIds: collectScenarioTestIds(spec, scenarioId),
  };

  if (hasPolicySet) {
    return { ...base, domain: 'policySet', policySet: policySet as PlacementPreviewSetupPayload };
  }
  return { ...base, domain: 'policy', policy: policy as PlacementPreviewSetupPayload };
}
