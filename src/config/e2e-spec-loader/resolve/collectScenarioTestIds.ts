import type { E2eSpecData } from '../schema';

export function collectScenarioTestIds(spec: E2eSpecData, scenarioId: string): string[] {
  const scenarioBody = spec.scenarios[scenarioId];
  const tests = scenarioBody?.tests ?? [];
  const matrix = spec.matrix ?? {};
  const matrixIds: string[] = [];
  for (const [testId, sid] of Object.entries(matrix)) {
    if (sid === scenarioId && testId !== '') {
      matrixIds.push(testId);
    }
  }
  return [...new Set([...tests, ...matrixIds])].sort();
}
