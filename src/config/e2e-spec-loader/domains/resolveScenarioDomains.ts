import type { E2eSpecData, ScenarioEntry } from '../schema';
import { resolveApplicationExpectationsDomain } from './application-expectations/resolveApplicationExpectationsDomain';
import { resolveArgoPushDomain } from './argo-push/resolveArgoPushDomain';
import { resolveSubscriptionDomain } from './subscription/resolveSubscriptionDomain';

/** Resolves `subscription`, `applicationExpectations`, and `argoPush` into `specDomains`. */
export function resolveScenarioDomains(
  spec: E2eSpecData,
  scenarioId: string,
  scenarioEntry: ScenarioEntry
): Record<string, unknown> {
  const specDomains: Record<string, unknown> = {};

  const subscription = resolveSubscriptionDomain(spec, scenarioId, scenarioEntry);
  if (subscription !== undefined) {
    specDomains.subscription = subscription;
  }

  const applicationExpectations = resolveApplicationExpectationsDomain(spec, scenarioId, scenarioEntry);
  if (applicationExpectations !== undefined) {
    specDomains.applicationExpectations = applicationExpectations;
  }

  const argoPush = resolveArgoPushDomain(spec, scenarioId, scenarioEntry);
  if (argoPush !== undefined) {
    specDomains.argoPush = argoPush;
  }

  return specDomains;
}
