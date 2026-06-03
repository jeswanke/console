import type { PlacementPreviewSetupPayload } from '../domains/placement-preview/placementPreviewSchema';

export type ResolvedPlacementScenario = {
  readonly scenarioId: string;
  readonly enabled: boolean;
  readonly testIds: string[];
  readonly domain: 'placement';
  readonly placement: PlacementPreviewSetupPayload;
};

export type ResolvedClusterScenario = ResolvedPlacementScenario;
