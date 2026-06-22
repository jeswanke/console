import type { E2eSpecData, ScenarioEntry } from '../schema';
import { resolveApplicationExpectationsDomain } from './application-expectations/resolveApplicationExpectationsDomain';
import { resolveArgoPushDomain } from './argo-push/resolveArgoPushDomain';
import { resolveFluxDomain } from './flux/resolveFluxDomain';
import { resolveOpenshiftDomain } from './openshift/resolveOpenshiftDomain';
import { resolveSubscriptionDomain } from './subscription/resolveSubscriptionDomain';

/** Resolves `subscription`, `applicationExpectations`, `argoPush`, `flux`, and `openshift` into `specDomains`. */
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

  const flux = resolveFluxDomain(spec, scenarioId, scenarioEntry);
  if (flux !== undefined) {
    specDomains.flux = flux;
  }

  const openshift = resolveOpenshiftDomain(spec, scenarioId, scenarioEntry);
  if (openshift !== undefined) {
    specDomains.openshift = openshift;
  }

  return specDomains;
}
