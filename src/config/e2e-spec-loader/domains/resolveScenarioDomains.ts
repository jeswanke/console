import type { E2eSpecData, ScenarioEntry } from '../schema';
import { resolveSubscriptionDomain } from './subscription/resolveSubscriptionDomain';

/**
 * Run all registered domain resolvers. Add new resolvers here for additional areas (e.g. Argo).
 */
export function resolveScenarioDomains(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): Record<string, unknown> {
  const domains: Record<string, unknown> = {};

  const subscription = resolveSubscriptionDomain(spec, scenarioId, scenarioEntry);
  if (subscription !== undefined) {
    domains.subscription = subscription;
  }

  return domains;
}
