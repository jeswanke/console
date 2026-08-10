import type { ApplicationExpectationsPayload } from './domains/application-expectations/applicationExpectationsSchema';
import type { CreateFluxApplicationOptions } from '@lib/app/flux/types';
import type { CreateOpenshiftApplicationOptions } from '@lib/app/openshift/types';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';

type ResolvedAppScenarioBase = {
  readonly scenarioId: string;
  readonly enabled: boolean;
  /** Polarion ids from `scenario.tests` plus `matrix` entries targeting this scenario. */
  readonly testIds: string[];
};

/** Subscription wizard + post-create expectations. */
export type ResolvedSubscriptionAppScenario = ResolvedAppScenarioBase & {
  readonly domain: 'subscription';
  readonly subscription: CreateSubscriptionOptions;
  readonly applicationExpectations: ApplicationExpectationsPayload;
};

/** Push-model ApplicationSet wizard payload. */
export type ResolvedArgoPushAppScenario = ResolvedAppScenarioBase & {
  readonly domain: 'argoPush';
  readonly argoPush: CreateArgoPushApplicationOptions;
};

/** Flux CD application (oc apply + UI table/topology). */
export type ResolvedFluxAppScenario = ResolvedAppScenarioBase & {
  readonly domain: 'flux';
  readonly flux: CreateFluxApplicationOptions;
};

/** Native OpenShift application (oc apply + ACM table/topology). */
export type ResolvedOpenshiftAppScenario = ResolvedAppScenarioBase & {
  readonly domain: 'openshift';
  readonly openshift: CreateOpenshiftApplicationOptions;
};

/** Fully resolved application e2e scenario (subscription, push-model ApplicationSet, Flux, or OpenShift). */
export type ResolvedAppScenario =
  | ResolvedSubscriptionAppScenario
  | ResolvedArgoPushAppScenario
  | ResolvedFluxAppScenario
  | ResolvedOpenshiftAppScenario;
