import type { ApplicationExpectationsPayload } from '../domains/application-expectations/applicationExpectationsSchema';
import { resolveScenarioDomains } from '../domains/resolveScenarioDomains';
import type { CreateFluxApplicationOptions } from '@lib/app/flux/types';
import type { CreateOpenshiftApplicationOptions } from '@lib/app/openshift/types';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import type { E2eSpecData } from '../schema';
import type { ResolvedAppScenario } from '../types';
import { collectScenarioTestIds } from './collectScenarioTestIds';

/** Resolves domain payloads for one scenario id (throws if missing or invalid). */
export function buildResolvedAppScenario(
  spec: E2eSpecData,
  scenarioId: string
): ResolvedAppScenario {
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
  const flux = specDomains.flux as CreateFluxApplicationOptions | undefined;
  const openshift = specDomains.openshift as CreateOpenshiftApplicationOptions | undefined;

  const domainCount = [subscription, argoPush, flux, openshift].filter(
    (d) => d !== undefined
  ).length;
  if (domainCount > 1) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" must define only one of subscription, argoPush, flux, or openshift`
    );
  }
  if (domainCount === 0) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" has no subscription, argoPush, flux, or openshift domain payload`
    );
  }
  if (subscription !== undefined && applicationExpectations === undefined) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" has no applicationExpectations domain payload`
    );
  }

  const base = {
    scenarioId,
    enabled: true as const,
    testIds: collectScenarioTestIds(spec, scenarioId),
  };

  if (argoPush !== undefined) {
    return {
      ...base,
      domain: 'argoPush',
      argoPush,
    };
  }

  if (flux !== undefined) {
    return {
      ...base,
      domain: 'flux',
      flux,
    };
  }

  if (openshift !== undefined) {
    return {
      ...base,
      domain: 'openshift',
      openshift,
    };
  }

  return {
    ...base,
    domain: 'subscription',
    subscription: subscription!,
    applicationExpectations: applicationExpectations!,
  };
}
