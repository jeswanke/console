import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { ansibleScaleScenarioSchema, type AnsibleScaleScenarioPayload } from './ansibleScaleSchema';

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

/** Merges profiles and `specDomains.ansibleScale` for ansible large-scale scenarios. */
export function resolveAnsibleScaleDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): AnsibleScaleScenarioPayload | undefined {
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
    layers.push(extractDomainOverlay(pr, 'ansibleScale'));
  }
  layers.push(scenarioEntry.specDomains?.ansibleScale ?? {});

  const merged = Object.assign({}, ...layers);
  if (Object.keys(merged).length === 0) {
    return undefined;
  }
  return ansibleScaleScenarioSchema.parse(merged);
}
