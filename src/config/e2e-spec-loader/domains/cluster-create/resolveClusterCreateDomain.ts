import type { E2eSpecData, ScenarioEntry } from '../../schema';
import {
  clusterCreateCredentialSchema,
  clusterCreateParamsSchema,
  type ClusterCreateCredentialPayload,
  type ClusterCreateParamsPayload,
} from './clusterCreateSchema';

function extractDomainOverlay(
  record: Record<string, unknown>,
  domainKey: string,
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

function mergeLayers(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry,
  domainKey: string,
): Record<string, unknown> {
  const profiles = spec.profiles ?? {};
  const profileNames = scenarioEntry.extends ?? [];
  const layers: Record<string, unknown>[] = [];

  for (const name of profileNames) {
    const pr = profiles[name];
    if (!pr) {
      throw new Error(
        `e2e-spec-data: unknown profile "${name}" referenced by scenario "${scenarioId}"`,
      );
    }
    layers.push(extractDomainOverlay(pr, domainKey));
  }
  layers.push(scenarioEntry.specDomains?.[domainKey] ?? {});

  return Object.assign({}, ...layers);
}

export function resolveClusterCreateCredential(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry,
): ClusterCreateCredentialPayload | undefined {
  const merged = mergeLayers(spec, scenarioId, scenarioEntry, 'credential');
  if (Object.keys(merged).length === 0) return undefined;
  return clusterCreateCredentialSchema.parse(merged);
}

function applyEnvOverrides(merged: Record<string, unknown>): Record<string, unknown> {
  const raw = process.env.CLC_OVERRIDES;
  if (!raw) return merged;
  try {
    return { ...merged, ...JSON.parse(raw) };
  } catch {
    throw new Error(`CLC_OVERRIDES is not valid JSON: ${raw}`);
  }
}

export function resolveClusterCreateParams(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry,
): ClusterCreateParamsPayload | undefined {
  const merged = mergeLayers(spec, scenarioId, scenarioEntry, 'cluster');
  if (Object.keys(merged).length === 0) return undefined;
  return clusterCreateParamsSchema.parse(applyEnvOverrides(merged));
}
