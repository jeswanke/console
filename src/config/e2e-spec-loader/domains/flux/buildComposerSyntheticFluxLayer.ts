import type { E2eSpecData } from '../../schema';
import type { ComposerBlockEntry } from '../blocks/expandComposer';
import { extractFluxLayer } from './extractFluxLayer';
import { mergeFluxLayers } from './fluxMerge';

/** Merges `scenario.blocks[].use` fragment keys into one `specDomains.flux` layer. */
export function buildComposerSyntheticFluxLayer(
  spec: E2eSpecData,
  scenarioId: string,
  blocks: ComposerBlockEntry[]
): Record<string, unknown> {
  const fragments = spec.fragments ?? {};
  const layers: Record<string, unknown>[] = [];

  for (const block of blocks) {
    for (const name of block.use ?? []) {
      const blob = fragments[name];
      if (!blob) {
        throw new Error(
          `e2e-spec-data: unknown fragment "${name}" in blocks for scenario "${scenarioId}"`
        );
      }
      layers.push(extractFluxLayer(blob as Record<string, unknown>));
    }
  }

  return mergeFluxLayers(...layers);
}
