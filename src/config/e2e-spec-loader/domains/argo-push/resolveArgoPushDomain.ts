import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { buildComposerSyntheticArgoPushLayer, scenarioUsesBlocks } from '../blocks/expandComposer';
import { mergeArgoPushLayers } from './argoPushMerge';
import { argoPushDomainPayloadSchema } from './argoPushSchema';
import { extractArgoPushLayer } from './extractArgoPushLayer';

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
    return undefined;
  }
  return parsed.data as unknown as CreateArgoPushApplicationOptions;
}
