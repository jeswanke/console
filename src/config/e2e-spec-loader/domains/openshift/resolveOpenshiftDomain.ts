import type { CreateOpenshiftApplicationOptions } from '@lib/app/openshift/types';
import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { extractOpenshiftLayer } from './extractOpenshiftLayer';
import { mergeOpenshiftLayers } from './openshiftMerge';
import { openshiftDomainPayloadSchema } from './openshiftSchema';

function hasOpenshiftDomainIntent(
  merged: Record<string, unknown>,
  scenarioOverlay: Record<string, unknown>
): boolean {
  if (Object.keys(scenarioOverlay).length > 0) {
    return true;
  }
  if (typeof merged.applicationName === 'string' && merged.applicationName.length > 0) {
    return true;
  }
  return false;
}

/** Merges profiles and `specDomains.openshift`; validates merged payload. */
export function resolveOpenshiftDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): CreateOpenshiftApplicationOptions | undefined {
  const profiles = spec.profiles ?? {};
  const profileNames = scenarioEntry.extends ?? [];
  const scenarioOverlay = scenarioEntry.specDomains?.openshift ?? {};

  const layers: Array<Record<string, unknown> | undefined> = [];
  for (const name of profileNames) {
    const pr = profiles[name];
    if (!pr) {
      throw new Error(
        `e2e-spec-data: unknown profile "${name}" referenced by scenario "${scenarioId}"`
      );
    }
    layers.push(extractOpenshiftLayer(pr));
  }
  layers.push(scenarioOverlay);

  const merged = mergeOpenshiftLayers(...layers);
  if (Object.keys(merged).length === 0) {
    return undefined;
  }

  const parsed = openshiftDomainPayloadSchema.safeParse(merged);
  if (!parsed.success) {
    if (!hasOpenshiftDomainIntent(merged, scenarioOverlay)) {
      return undefined;
    }
    throw new Error(
      `e2e-spec-data: invalid openshift domain for scenario "${scenarioId}": ${parsed.error.message}\n${JSON.stringify(parsed.error.format(), null, 2)}`
    );
  }
  return parsed.data as CreateOpenshiftApplicationOptions;
}
