import type { ApplicationExpectationsPayload } from './domains/application-expectations/applicationExpectationsSchema';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';

/** Fully resolved application e2e scenario (subscription wizard + post-create expectations). */
export type ResolvedAppScenario = {
  readonly scenarioId: string;
  readonly enabled: boolean;
  /** Polarion ids from `scenario.tests` plus `matrix` entries targeting this scenario. */
  readonly testIds: string[];
  readonly subscription: CreateSubscriptionOptions;
  readonly applicationExpectations: ApplicationExpectationsPayload;
};
