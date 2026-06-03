import type { ApplicationExpectationsPayload } from '../domains/application-expectations/applicationExpectationsSchema';
import { resolveScenarioDomains } from '../domains/resolveScenarioDomains';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';
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

/** Resolves `subscription` and `applicationExpectations` for one scenario id (throws if missing). */
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
  if (subscription === undefined) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" has no subscription domain payload`
    );
  }
  const applicationExpectations = specDomains.applicationExpectations as
    | ApplicationExpectationsPayload
    | undefined;
  if (applicationExpectations === undefined) {
    throw new Error(
      `e2e-spec-data: scenario "${scenarioId}" has no applicationExpectations domain payload`
    );
  }

  const tests = scenarioBody.tests ?? [];
  const matrixIds = collectMatrixTestIdsForScenario(spec, scenarioId);
  const testIds = [...new Set([...tests, ...matrixIds])].sort();

  return {
    scenarioId,
    enabled: true,
    testIds,
    subscription,
    applicationExpectations,
  };
}
