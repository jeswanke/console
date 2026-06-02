import type { E2eSpecData } from '../schema';

/**
 * Scenario ids whose `tests` list or `matrix` entry matches `testId`.
 * Does not resolve domains — use {@link buildResolvedAppScenario} after choosing an id.
 */
export function findScenarioIdsByTestId(spec: E2eSpecData, testId: string): string[] {
  const fromMatrix = spec.matrix?.[testId];
  if (fromMatrix) {
    const body = spec.scenarios[fromMatrix];
    if (body?.enabled === false) {
      return [];
    }
    return [fromMatrix];
  }

  const out: string[] = [];
  for (const id of Object.keys(spec.scenarios)) {
    const body = spec.scenarios[id];
    if (body?.enabled === false) continue;
    const tests = body.tests ?? [];
    if (tests.includes(testId)) {
      out.push(id);
    }
  }
  return out;
}
