import type { CreateFluxApplicationOptions } from '@lib/app/flux/types';
import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { scenarioUsesBlocks } from '../blocks/expandComposer';
import { buildComposerSyntheticFluxLayer } from './buildComposerSyntheticFluxLayer';
import { extractFluxLayer } from './extractFluxLayer';
import { fluxDomainPayloadSchema } from './fluxSchema';
import { mergeFluxLayers } from './fluxMerge';

function hasFluxDomainIntent(
  merged: Record<string, unknown>,
  scenarioOverlay: Record<string, unknown>
): boolean {
  if (Object.keys(scenarioOverlay).length > 0) {
    return true;
  }
  if (typeof merged.applicationName === 'string' && merged.applicationName.length > 0) {
    return true;
  }
  if (merged.kind === 'git' || merged.kind === 'helm') {
    return true;
  }
  return false;
}

/** Merges composer blocks, profiles, and `specDomains.flux`; validates merged payload. */
export function resolveFluxDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): CreateFluxApplicationOptions | undefined {
  const profiles = spec.profiles ?? {};
  const profileNames = scenarioEntry.extends ?? [];
  const scenarioOverlay = scenarioEntry.specDomains?.flux ?? {};

  const layers: Array<Record<string, unknown> | undefined> = [];

  if (scenarioUsesBlocks(scenarioEntry)) {
    layers.push(buildComposerSyntheticFluxLayer(spec, scenarioId, scenarioEntry.blocks!));
  }
  for (const name of profileNames) {
    const pr = profiles[name];
    if (!pr) {
      throw new Error(
        `e2e-spec-data: unknown profile "${name}" referenced by scenario "${scenarioId}"`
      );
    }
    layers.push(extractFluxLayer(pr));
  }
  layers.push(scenarioOverlay);

  const merged = mergeFluxLayers(...layers);
  if (Object.keys(merged).length === 0) {
    return undefined;
  }

  const parsed = fluxDomainPayloadSchema.safeParse(merged);
  if (!parsed.success) {
    if (!hasFluxDomainIntent(merged, scenarioOverlay)) {
      return undefined;
    }
    throw new Error(
      `e2e-spec-data: invalid flux domain for scenario "${scenarioId}": ${parsed.error.message}\n${JSON.stringify(parsed.error.format(), null, 2)}`
    );
  }
  return parsed.data as CreateFluxApplicationOptions;
}
