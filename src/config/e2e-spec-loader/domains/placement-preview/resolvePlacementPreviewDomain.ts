import type { E2eSpecData, ScenarioEntry } from '../../schema';
import {
  placementPreviewSetupSchema,
  type PlacementPreviewSetupPayload,
} from './placementPreviewSchema';

function extractDomainOverlay(
  record: Record<string, unknown>,
  domainKey: string
): Record<string, unknown> {
  const specDomains = record.specDomains;
  if (specDomains && typeof specDomains === 'object') {
    const overlay = (specDomains as Record<string, unknown>)[domainKey];
    if (overlay && typeof overlay === 'object' && Object.keys(overlay).length > 0) {
      return overlay as Record<string, unknown>;
    }
  }
  return {};
}

/** Merges profiles and `specDomains.<domainKey>` for placement-preview setup payloads. */
export function resolvePlacementPreviewDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry,
  domainKey: string
): PlacementPreviewSetupPayload | undefined {
  const profiles = spec.profiles ?? {};
  const profileNames = scenarioEntry.extends ?? [];
  const layers: Record<string, unknown>[] = [];

  for (const name of profileNames) {
    const pr = profiles[name];
    if (!pr) {
      throw new Error(
        `e2e-spec-data: unknown profile "${name}" referenced by scenario "${scenarioId}"`
      );
    }
    layers.push(extractDomainOverlay(pr, domainKey));
  }
  layers.push(scenarioEntry.specDomains?.[domainKey] ?? {});

  const merged = Object.assign({}, ...layers);
  if (Object.keys(merged).length === 0) {
    return undefined;
  }
  return placementPreviewSetupSchema.parse(merged);
}
