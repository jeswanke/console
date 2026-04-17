import type { CreateSubscriptionOptions } from '@lib/subscription-create';
import type { E2eSpecData, ScenarioEntry } from '../../schema';
import { mergeSubscriptionLayers } from './subscriptionMerge';
import { subscriptionDomainPayloadSchema } from './subscriptionSchema';

/**
 * Pull subscription-relevant fields from a fragment or profile blob.
 * - Nested: `domains.subscription` or top-level `subscription`
 * - Legacy: entire blob is the subscription slice (e.g. `{ repositories: [...] }` only)
 */
export function extractSubscriptionLayer(blob: Record<string, unknown>): Record<string, unknown> {
  const domains = blob.domains;
  if (isPlainObject(domains) && isPlainObject(domains.subscription)) {
    return { ...domains.subscription };
  }
  if (isPlainObject(blob.subscription)) {
    return { ...blob.subscription };
  }
  return { ...blob };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Merge fragments → profiles → scenario `domains.subscription` into one subscription payload and validate.
 */
export function resolveSubscriptionDomain(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): CreateSubscriptionOptions | undefined {
  const fragments = spec.fragments ?? {};
  const profiles = spec.profiles ?? {};

  const fragNames = scenarioEntry.fragments ?? [];
  const profileNames = scenarioEntry.extends ?? [];
  const scenarioOverlay = scenarioEntry.domains?.subscription ?? {};

  const layers: Array<Record<string, unknown> | undefined> = [];

  for (const name of fragNames) {
    const f = fragments[name];
    if (!f) {
      throw new Error(
        `e2e-spec-data: unknown fragment "${name}" referenced by scenario "${scenarioId}"`
      );
    }
    layers.push(extractSubscriptionLayer(f));
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
    return undefined;
  }
  return parsed.data as CreateSubscriptionOptions;
}
