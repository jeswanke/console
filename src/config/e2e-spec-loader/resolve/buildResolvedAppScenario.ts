import type { ApplicationExpectationsPayload } from '../domains/application-expectations/applicationExpectationsSchema';
import { resolveScenarioDomains } from '../domains/resolveScenarioDomains';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import type { E2eSpecData } from '../schema';
import type { ResolvedAppScenario } from '../types';

function collectMatrixTestIdsForScenario(spec: E2eSpecData, scenarioId: string): string[] {
  const matrix = spec.matrix ?? {};
  const ids: string[] = [];
  for (const [testId, sid] of Object.entries(matrix)) {
    if (sid === scenarioId && testId !== '') {
      ids.push(testId);
    }
  }
  return ids;
}

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
  if (hasArgoPush) {
    if (!argoPush) {
      throw new Error(`e2e-spec-data: scenario "${scenarioId}" has invalid argoPush domain payload`);
    }
  } else if (hasSubscription) {
    if (applicationExpectations === undefined) {
      throw new Error(
        `e2e-spec-data: scenario "${scenarioId}" has no applicationExpectations domain payload`
      );
    }
  } else {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" has no subscription or argoPush domain payload`
    );
  }

  const tests = scenarioBody.tests ?? [];
  const matrixIds = collectMatrixTestIdsForScenario(spec, scenarioId);
  const testIds = [...new Set([...tests, ...matrixIds])].sort();

  const base = { scenarioId, enabled: true as const, testIds };

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
