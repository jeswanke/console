import type { PlacementPreviewSetupPayload } from '../domains/placement-preview/placementPreviewSchema';

type ResolvedScenarioBase = {
  readonly scenarioId: string;
  readonly enabled: boolean;
  readonly testIds: string[];
};

export type ResolvedPolicyScenario = ResolvedScenarioBase & {
  readonly domain: 'policy';
  readonly policy: PlacementPreviewSetupPayload;
};

export type ResolvedPolicySetScenario = ResolvedScenarioBase & {
  readonly domain: 'policySet';
  readonly policySet: PlacementPreviewSetupPayload;
};

export type ResolvedGovernanceScenario = ResolvedPolicyScenario | ResolvedPolicySetScenario;
