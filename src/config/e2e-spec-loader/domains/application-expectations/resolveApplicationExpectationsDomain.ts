import type { E2eSpecData, ScenarioEntry } from '../../schema';
import {
  applicationExpectationsDomainSchema,
  flattenClusterResourceBlocks,
} from './applicationExpectationsSchema';
import type {
  ApplicationClusterResourceRow,
  ApplicationExpectationsPayload,
  ClusterResourcesPerRepoEntry,
} from './applicationExpectationsSchema';
import { isPlainObject } from '../../isPlainObject';
import { mergeApplicationExpectationsLayers } from './applicationExpectationsMerge';
import { extractApplicationExpectationsLayer } from './extractApplicationExpectationsLayer';
import {
  buildComposerSyntheticApplicationExpectationsLayer,
  scenarioUsesBlocks,
} from '../blocks/expandComposer';
import { resolveSubscriptionDomain } from '../subscription/resolveSubscriptionDomain';

/** Adds `repositories[i]` path/kind to each `clusterResources` block. */
export function buildClusterResourcesPerRepo(
  blocks: ApplicationClusterResourceRow[][],
  repositories: Array<Record<string, unknown>> | undefined
): ClusterResourcesPerRepoEntry[] {
  return blocks.map((rows, i) => {
    const repo = repositories?.[i];
    const path = repo && typeof repo.path === 'string' ? repo.path : undefined;
    const kind = repo && typeof repo.kind === 'string' ? repo.kind : undefined;
    return {
      repositoryIndex: i,
      repositoryPath: path,
      repositoryKind: kind,
      rows,
    };
  });
}

export function normalizeMergedApplicationExpectations(merged: Record<string, unknown>): void {
  const blocks = merged.clusterResources as unknown[][] | undefined;

  if (Array.isArray(blocks) && blocks.length > 0) {
    const normalized = blocks.map((block) => (Array.isArray(block) ? block : []));
    merged.clusterResources = normalized;
    merged.clusterResourcesFlat = flattenClusterResourceBlocks(
      normalized as ApplicationClusterResourceRow[][]
    );
  }
}

/** Namespace from `specDomains.subscription` on the scenario entry. */
export function getScenarioSubscriptionNamespace(entry: ScenarioEntry): string | undefined {
  const sub = entry.specDomains?.subscription as Record<string, unknown> | undefined;
  const ns = sub?.namespace;
  return typeof ns === 'string' && ns.length > 0 ? ns : undefined;
}

/** Fills empty row `namespace` from the scenario subscription namespace. */
export function fillApplicationExpectationsNamespaces(
  merged: Record<string, unknown>,
  namespace: string
): void {
  const fillRow = (row: unknown) => {
    if (!isPlainObject(row)) return;
    const n = row.namespace;
    if (n === undefined || n === '') {
      row.namespace = namespace;
    }
  };

  const blocks = merged.clusterResources as unknown[][] | undefined;
  if (Array.isArray(blocks)) {
    for (const block of blocks) {
      if (!Array.isArray(block)) continue;
      for (const row of block) fillRow(row);
    }
  }

  const flat = merged.clusterResourcesFlat as unknown[] | undefined;
  if (Array.isArray(flat)) {
    for (const row of flat) fillRow(row);
  }
}

/** Merges composer blocks, profiles, and scenario overlay; validates. Returns `undefined` when there are no rows. */
export function resolveApplicationExpectationsDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): ApplicationExpectationsPayload | undefined {
  const profiles = spec.profiles ?? {};

  const profileNames = scenarioEntry.extends ?? [];
  const overlay = scenarioEntry.specDomains?.applicationExpectations;
  const scenarioOverlay =
    overlay !== null && typeof overlay === 'object' && !Array.isArray(overlay)
      ? { ...(overlay as Record<string, unknown>) }
      : {};

  const layers: Array<Record<string, unknown> | undefined> = [];

  if (scenarioUsesBlocks(scenarioEntry)) {
    layers.push(
      buildComposerSyntheticApplicationExpectationsLayer(spec, scenarioId, scenarioEntry.blocks!)
    );
  }
  for (const name of profileNames) {
    const pr = profiles[name];
    if (!pr) {
      throw new Error(
        `e2e-spec-data: unknown profile "${name}" referenced by scenario "${scenarioId}"`
      );
    }
    layers.push(extractApplicationExpectationsLayer(pr));
  }
  layers.push(scenarioOverlay);

  const merged = mergeApplicationExpectationsLayers(...layers);
  normalizeMergedApplicationExpectations(merged);

  const defaultNs = getScenarioSubscriptionNamespace(scenarioEntry);
  if (defaultNs) {
    fillApplicationExpectationsNamespaces(merged, defaultNs);
  }

  const flat = merged.clusterResourcesFlat as unknown[] | undefined;
  if (Object.keys(merged).length === 0 || !Array.isArray(flat) || flat.length === 0) {
    return undefined;
  }
  const parsed = applicationExpectationsDomainSchema.safeParse(merged);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(
      `e2e-spec-data: applicationExpectations validation failed for scenario "${scenarioId}": ${detail}`
    );
  }
  const subscription = resolveSubscriptionDomain(spec, scenarioId, scenarioEntry);
  const repositories = subscription?.repositories as Array<Record<string, unknown>> | undefined;
  const clusterResourcesPerRepo = buildClusterResourcesPerRepo(parsed.data.clusterResources, repositories);
  return { ...parsed.data, clusterResourcesPerRepo };
}
