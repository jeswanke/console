import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { resolvePlacementPreviewDomain } from '../placement-preview/resolvePlacementPreviewDomain';
import type { PlacementPreviewSetupPayload } from '../placement-preview/placementPreviewSchema';

export function resolvePolicyDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): PlacementPreviewSetupPayload | undefined {
  return resolvePlacementPreviewDomain(spec, scenarioId, scenarioEntry, 'policy');
}
