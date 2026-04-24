/**
 * `scenario.blocks[].use` names `spec.fragments` keys per lane; merged into subscription and applicationExpectations layers.
 */
import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { isPlainObject } from '../../isPlainObject';
import { mergePerBlockLayers } from '../subscription/subscriptionMerge';
import { extractSubscriptionLayer } from '../subscription/extractSubscriptionLayer';
import { extractApplicationExpectationsLayer } from '../application-expectations/extractApplicationExpectationsLayer';
import { mergeApplicationExpectationsLayers } from '../application-expectations/applicationExpectationsMerge';

export type ComposerBlockEntry = { use: string[] };

export function scenarioUsesBlocks(scenarioEntry: ScenarioEntry): boolean {
  const b = scenarioEntry.blocks;
  return Array.isArray(b) && b.length > 0;
}

/**
 * For a fragment's `perBlock` array, pick the slice that applies when this fragment is composed into composer
 * **block index** `composerBlockIndex`.
 *
 * - Prefer `perBlock[composerBlockIndex]` when it is a non-empty object (e.g. second-channel CD).
 * - Otherwise fall back to `perBlock[0]` (typical single-slot primitives: TW, automation, first-channel CD).
 */
export function pickPerBlockSliceForComposer(
  fragmentPerBlock: unknown[] | undefined,
  composerBlockIndex: number
): Record<string, unknown> | undefined {
  if (!Array.isArray(fragmentPerBlock) || fragmentPerBlock.length === 0) {
    return undefined;
  }
  const at = fragmentPerBlock[composerBlockIndex];
  if (isPlainObject(at) && Object.keys(at).length > 0) {
    return at;
  }
  const first = fragmentPerBlock[0];
  if (isPlainObject(first) && Object.keys(first).length > 0) {
    return first;
  }
  return undefined;
}

export function mergeSubscriptionSlicesForComposerBlock(
  spec: E2eSpecData,
  scenarioId: string,
  useNames: string[],
  composerBlockIndex: number
): Record<string, unknown> {
  const fragments = spec.fragments ?? {};
  const repositories: unknown[] = [];
  let perBlockMerged: Record<string, unknown> | undefined;
  const other: Record<string, unknown> = {};

  for (const name of useNames) {
    const blob = fragments[name];
    if (!blob) {
      throw new Error(
        `e2e-spec-data: unknown fragment "${name}" in blocks for scenario "${scenarioId}" (composer block ${composerBlockIndex})`
      );
    }
    const sub = extractSubscriptionLayer(blob as Record<string, unknown>);
    if (Array.isArray(sub.repositories)) {
      repositories.push(...sub.repositories);
    }
    const slice = pickPerBlockSliceForComposer(sub.perBlock as unknown[] | undefined, composerBlockIndex);
    if (slice !== undefined) {
      perBlockMerged = mergePerBlockLayers(perBlockMerged, slice);
    }
    for (const [k, v] of Object.entries(sub)) {
      if (k === 'repositories' || k === 'perBlock') continue;
      if (v !== undefined) other[k] = v;
    }
  }

  const out: Record<string, unknown> = { ...other };
  if (repositories.length > 0) {
    out.repositories = repositories;
  }
  if (perBlockMerged !== undefined && Object.keys(perBlockMerged).length > 0) {
    out.perBlock = [perBlockMerged];
  }
  return out;
}

/** Synthetic layer: concat `repositories` across blocks; `perBlock[i]` from each block’s `use`. */
export function buildComposerSyntheticSubscriptionLayer(
  spec: E2eSpecData,
  scenarioId: string,
  blocks: ComposerBlockEntry[]
): Record<string, unknown> {
  const allRepositories: unknown[] = [];
  const perBlockOut: unknown[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const use = blocks[i]?.use ?? [];
    const merged = mergeSubscriptionSlicesForComposerBlock(spec, scenarioId, use, i);
    if (Array.isArray(merged.repositories)) {
      allRepositories.push(...merged.repositories);
    }
    const pb = merged.perBlock as unknown[] | undefined;
    if (Array.isArray(pb) && pb[0] && isPlainObject(pb[0])) {
      perBlockOut.push(pb[0]);
    } else {
      perBlockOut.push({});
    }
  }

  return {
    repositories: allRepositories,
    perBlock: perBlockOut,
  };
}

export function mergeExpectationsRowsForComposerBlock(
  spec: E2eSpecData,
  scenarioId: string,
  useNames: string[],
  composerBlockIndex: number
): unknown[] {
  const fragments = spec.fragments ?? {};
  const aeLayers: Array<Record<string, unknown>> = [];

  for (const name of useNames) {
    const blob = fragments[name];
    if (!blob) {
      throw new Error(
        `e2e-spec-data: unknown fragment "${name}" in blocks for scenario "${scenarioId}" (expectations, block ${composerBlockIndex})`
      );
    }
    aeLayers.push(extractApplicationExpectationsLayer(blob as Record<string, unknown>));
  }

  const merged = mergeApplicationExpectationsLayers(...aeLayers);
  const blocks = merged.clusterResources as unknown[][] | undefined;
  if (Array.isArray(blocks) && blocks.length > 0) {
    if (blocks.length === 1) {
      const inner = blocks[0];
      return Array.isArray(inner) ? [...inner] : [];
    }
    const at = blocks[composerBlockIndex];
    if (Array.isArray(at)) {
      return [...at];
    }
    return [];
  }
  return [];
}

export function buildComposerSyntheticApplicationExpectationsLayer(
  spec: E2eSpecData,
  scenarioId: string,
  blocks: ComposerBlockEntry[]
): Record<string, unknown> {
  const clusterResources: unknown[][] = [];

  for (let i = 0; i < blocks.length; i++) {
    const rows = mergeExpectationsRowsForComposerBlock(spec, scenarioId, blocks[i]!.use, i);
    clusterResources.push(rows);
  }

  return {
    clusterResources,
  };
}
