import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';
import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { mergeSubscriptionLayers } from './subscriptionMerge';
import { subscriptionDomainPayloadSchema } from './subscriptionSchema';
import { extractSubscriptionLayer } from './extractSubscriptionLayer';
import {
  buildComposerSyntheticSubscriptionLayer,
  scenarioUsesBlocks,
} from '../blocks/expandComposer';

/** True when the scenario is meant to resolve subscription (not argo-only block noise). */
function hasSubscriptionDomainIntent(
  merged: Record<string, unknown>,
  scenarioOverlay: Record<string, unknown>
): boolean {
  if (Object.keys(scenarioOverlay).length > 0) {
    return true;
  }
  if (
    Object.prototype.hasOwnProperty.call(merged, 'applicationName') ||
    Object.prototype.hasOwnProperty.call(merged, 'namespace') ||
    Object.prototype.hasOwnProperty.call(merged, 'repositories')
  ) {
    return true;
  }
  return false;
}

/** Merges composer blocks, profiles, and `specDomains.subscription`; validates merged payload. */
export function resolveSubscriptionDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): CreateSubscriptionOptions | undefined {
  const profiles = spec.profiles ?? {};

  const profileNames = scenarioEntry.extends ?? [];
  const scenarioOverlay = scenarioEntry.specDomains?.subscription ?? {};

  const layers: Array<Record<string, unknown> | undefined> = [];

  if (scenarioUsesBlocks(scenarioEntry)) {
    layers.push(
      buildComposerSyntheticSubscriptionLayer(spec, scenarioId, scenarioEntry.blocks!)
    );
  }
  for (const name of profileNames) {
    const pr = profiles[name];
    if (!pr) {
      throw new Error(
        `e2e-spec-data: unknown profile "${name}" referenced by scenario "${scenarioId}"`
      );
    }
    layers.push(extractSubscriptionLayer(pr));
  }
  layers.push(scenarioOverlay);

  const merged = mergeSubscriptionLayers(...layers);
  if (Object.keys(merged).length === 0) {
    return undefined;
  }
  const parsed = subscriptionDomainPayloadSchema.safeParse(merged);
  if (!parsed.success) {
    if (!hasSubscriptionDomainIntent(merged, scenarioOverlay)) {
      return undefined;
    }
    throw new Error(
      `e2e-spec-data: invalid subscription domain for scenario "${scenarioId}": ${parsed.error.message}\n${JSON.stringify(parsed.error.format(), null, 2)}`
    );
  }
  return parsed.data as unknown as CreateSubscriptionOptions;
}
