import type { ApplicationExpectationsPayload } from '../domains/application-expectations/applicationExpectationsSchema';
import { resolveScenarioDomains } from '../domains/resolveScenarioDomains';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import type { E2eSpecData } from '../schema';
import type { ResolvedAppScenario } from '../types';
import { collectScenarioTestIds } from './collectScenarioTestIds';

/** Resolves domain payloads for one scenario id (throws if missing or invalid). */
export function buildResolvedAppScenario(spec: E2eSpecData, scenarioId: string): ResolvedAppScenario {
  const scenarioBody = spec.scenarios[scenarioId];
  if (!scenarioBody) {
    throw new Error(`e2e-spec-data: unknown scenario "${scenarioId}"`);
  }
  if (scenarioBody.enabled === false) {
    throw new Error(`e2e-spec-data: scenario "${scenarioId}" is disabled`);
  }

  const specDomains = resolveScenarioDomains(spec, scenarioId, scenarioBody);
  const subscription = specDomains.subscription as CreateSubscriptionOptions | undefined;
  const applicationExpectations = specDomains.applicationExpectations as
    | ApplicationExpectationsPayload
    | undefined;
  const argoPush = specDomains.argoPush as CreateArgoPushApplicationOptions | undefined;

  const hasSubscription = subscription !== undefined;
  const hasArgoPush = argoPush !== undefined;

  if (hasSubscription && hasArgoPush) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" must not define both subscription and argoPush domains`
    );
  }
  if (!hasArgoPush && !hasSubscription) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" has no subscription or argoPush domain payload`
    );
  }
  if (hasSubscription && applicationExpectations === undefined) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" has no applicationExpectations domain payload`
    );
  }

  const base = {
    scenarioId,
    enabled: true as const,
    testIds: collectScenarioTestIds(spec, scenarioId),
  };

  if (hasArgoPush) {
    return {
      ...base,
      domain: 'argoPush',
      argoPush: argoPush!,
    };
  }

  return {
    ...base,
    domain: 'subscription',
    subscription: subscription!,
    applicationExpectations: applicationExpectations!,
  };
}
