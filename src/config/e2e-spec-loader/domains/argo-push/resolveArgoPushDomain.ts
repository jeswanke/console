import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { buildComposerSyntheticArgoPushLayer, scenarioUsesBlocks } from '../blocks/expandComposer';
import { mergeArgoPushLayers } from './argoPushMerge';
import { argoPushDomainPayloadSchema } from './argoPushSchema';
import { extractArgoPushLayer } from './extractArgoPushLayer';

/** True when the scenario is meant to resolve argoPush (not subscription-only block noise). */
function hasArgoPushDomainIntent(
  merged: Record<string, unknown>,
  scenarioOverlay: Record<string, unknown>
): boolean {
  if (Object.keys(scenarioOverlay).length > 0) {
    return true;
  }
  if (typeof merged.applicationName === 'string' && merged.applicationName.length > 0) {
    return true;
  }
  if (typeof merged.argoServerLabel === 'string' && merged.argoServerLabel.length > 0) {
    return true;
  }
  if (typeof merged.destinationNamespace === 'string' && merged.destinationNamespace.length > 0) {
    return true;
  }
  const git = merged.git;
  if (typeof git === 'object' && git !== null && typeof (git as Record<string, unknown>).url === 'string') {
    return true;
  }
  if (typeof merged.clusterSet === 'string' && merged.clusterSet.length > 0) {
    return true;
  }
  return false;
}

/** Merges composer blocks, profiles, and `specDomains.argoPush`; validates merged payload. */
export function resolveArgoPushDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): CreateArgoPushApplicationOptions | undefined {
  const profiles = spec.profiles ?? {};
  const profileNames = scenarioEntry.extends ?? [];
  const scenarioOverlay = scenarioEntry.specDomains?.argoPush ?? {};

  const layers: Array<Record<string, unknown> | undefined> = [];

  if (scenarioUsesBlocks(scenarioEntry)) {
    layers.push(buildComposerSyntheticArgoPushLayer(spec, scenarioId, scenarioEntry.blocks!));
  }
  for (const name of profileNames) {
    const pr = profiles[name];
    if (!pr) {
      throw new Error(
        `e2e-spec-data: unknown profile "${name}" referenced by scenario "${scenarioId}"`
      );
    }
    layers.push(extractArgoPushLayer(pr));
  }
  layers.push(scenarioOverlay);

  const merged = mergeArgoPushLayers(...layers);
  if (Object.keys(merged).length === 0) {
    return undefined;
  }
  const parsed = argoPushDomainPayloadSchema.safeParse(merged);
  if (!parsed.success) {
    if (!hasArgoPushDomainIntent(merged, scenarioOverlay)) {
      return undefined;
    }
    throw new Error(
      `e2e-spec-data: invalid argoPush domain for scenario "${scenarioId}": ${parsed.error.message}\n${JSON.stringify(parsed.error.format(), null, 2)}`
    );
  }
  return parsed.data as unknown as CreateArgoPushApplicationOptions;
}
