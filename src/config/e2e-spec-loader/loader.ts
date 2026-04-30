import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import type { CreateSubscriptionOptions } from '@lib/app/subscription-create';
import type { ApplicationExpectationsPayload } from './domains/application-expectations/applicationExpectationsSchema';
import { e2eSpecDataSchema } from './schema';
import { mergeE2eSpecData } from './specFileMerge';
import type { E2eSpecData } from './schema';
import { resolveScenarioDomains } from './domains/resolveScenarioDomains';

export interface ResolvedE2eScenario {
  readonly scenarioId: string;
  /** `false` omits the scenario from `getTestDataForE2e('')`. */
  readonly enabled: boolean;
  /** Polarion ids from `scenario.tests` plus `matrix` entries targeting this scenario. */
  readonly testIds: string[];
  /** Resolved domains (`subscription`, `applicationExpectations`, …). */
  readonly specDomains: Record<string, unknown>;
}

let cachedSourcePath: string | undefined;
let cachedParsed: E2eSpecData | undefined;

/** Default `src/config/e2e-spec-data/`; override with `E2E_SPECS_PATH` (file or directory). */
function defaultSpecDataPath(): string {
  return path.join(__dirname, '..', 'e2e-spec-data');
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Sorted `applications/*.yaml`, then `matrix.yaml` if it exists. */
export function listE2eSpecYamlFiles(dir: string): string[] {
  const out: string[] = [];
  const appsDir = path.join(dir, 'applications');
  if (fs.existsSync(appsDir)) {
    const names = fs
      .readdirSync(appsDir)
      .filter((fn) => fn.endsWith('.yaml') || fn.endsWith('.yml'))
      .sort();
    for (const fn of names) {
      out.push(path.join(appsDir, fn));
    }
  }
  const matrix = path.join(dir, 'matrix.yaml');
  if (fs.existsSync(matrix)) {
    out.push(matrix);
  }
  return out;
}

function loadE2eSpecDataFromDirectory(dir: string): E2eSpecData {
  const files = listE2eSpecYamlFiles(dir);
  if (files.length === 0) {
    throw new Error(`e2e-spec-data: no YAML files found under "${dir}"`);
  }
  const parts: E2eSpecData[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const data = parseYaml(raw);
    parts.push(e2eSpecDataSchema.parse(data));
  }
  return mergeE2eSpecData(parts);
}

function loadE2eSpecDataFromFile(file: string): E2eSpecData {
  const raw = fs.readFileSync(file, 'utf8');
  const data = parseYaml(raw);
  return e2eSpecDataSchema.parse(data);
}

function resolveE2eSpecDataSource(configPath?: string): { source: string; load: () => E2eSpecData } {
  const p = configPath ?? process.env.E2E_SPECS_PATH ?? defaultSpecDataPath();
  if (isDirectory(p)) {
    return { source: p, load: () => loadE2eSpecDataFromDirectory(p) };
  }
  if (isFile(p)) {
    return { source: p, load: () => loadE2eSpecDataFromFile(p) };
  }
  throw new Error(
    `e2e-spec-data: E2E_SPECS_PATH / config path is not a file or directory: "${p}"`
  );
}

/** Parsed merged spec; cached per source path. `E2E_SPECS_PATH` or `configPath` selects file vs directory (see {@link listE2eSpecYamlFiles}). */
export function loadE2eSpecData(configPath?: string): E2eSpecData {
  const { source, load } = resolveE2eSpecDataSource(configPath);
  if (cachedParsed && cachedSourcePath === source) {
    return cachedParsed;
  }
  const parsed = load();
  cachedSourcePath = source;
  cachedParsed = parsed;
  return parsed;
}

/** Clears the in-memory spec cache. */
export function clearE2eSpecDataCache(): void {
  cachedSourcePath = undefined;
  cachedParsed = undefined;
}

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

function toResolvedScenario(spec: E2eSpecData, scenarioId: string): ResolvedE2eScenario {
  const scenarioBody = spec.scenarios[scenarioId];
  if (!scenarioBody) {
    throw new Error(`e2e-spec-data: unknown scenario "${scenarioId}"`);
  }
  const { enabled = true, tests = [] } = scenarioBody;

  const specDomains = resolveScenarioDomains(spec, scenarioId, scenarioBody);

  const matrixIds = collectMatrixTestIdsForScenario(spec, scenarioId);
  const testIds = [...new Set([...tests, ...matrixIds])].sort();

  return {
    scenarioId,
    enabled,
    testIds,
    specDomains,
  };
}

/** Throws if `specDomains.subscription` is missing. */
export function getSubscriptionDomainPayload(resolved: ResolvedE2eScenario): CreateSubscriptionOptions {
  const s = resolved.specDomains.subscription;
  if (s === undefined) {
    throw new Error(
      `e2e-spec-data: scenario "${resolved.scenarioId}" has no subscription domain payload`
    );
  }
  return s as CreateSubscriptionOptions;
}

/** Throws if `specDomains.applicationExpectations` is missing. */
export function getApplicationExpectationsPayload(
  resolved: ResolvedE2eScenario
): ApplicationExpectationsPayload {
  const d = resolved.specDomains.applicationExpectations;
  if (d === undefined) {
    throw new Error(
      `e2e-spec-data: scenario "${resolved.scenarioId}" has no applicationExpectations domain payload`
    );
  }
  return d as unknown as ApplicationExpectationsPayload;
}

export function getE2eScenario(scenarioId: string, configPath?: string): ResolvedE2eScenario {
  const spec = loadE2eSpecData(configPath);
  if (!spec.scenarios[scenarioId]) {
    throw new Error(`e2e-spec-data: scenario not found: "${scenarioId}"`);
  }
  return toResolvedScenario(spec, scenarioId);
}

/**
 * `testId === ''`: all enabled scenarios that resolve (failures skipped). Else: `matrix[testId]` or scenarios whose `tests` contains `testId`.
 * With `E2E_SPEC_DEBUG` set, logs errors for skipped scenarios when `testId === ''`.
 */
export function getTestDataForE2e(testId: string, configPath?: string): ResolvedE2eScenario[] {
  const spec = loadE2eSpecData(configPath);
  const scenarioIds = Object.keys(spec.scenarios);

  if (testId === '') {
    const out: ResolvedE2eScenario[] = [];
    for (const id of scenarioIds) {
      const body = spec.scenarios[id];
      if (body.enabled === false) continue;
      try {
        out.push(toResolvedScenario(spec, id));
      } catch (e) {
        if (process.env.E2E_SPEC_DEBUG) {
          console.error(`e2e-spec-data: skipped scenario "${id}"`, e);
        }
      }
    }
    return out;
  }

  const fromMatrix = spec.matrix?.[testId];
  if (fromMatrix) {
    const body = spec.scenarios[fromMatrix];
    if (body?.enabled === false) {
      return [];
    }
    return [toResolvedScenario(spec, fromMatrix)];
  }

  const out: ResolvedE2eScenario[] = [];
  for (const id of scenarioIds) {
    const body = spec.scenarios[id];
    if (body.enabled === false) continue;
    const tests = body.tests ?? [];
    if (tests.includes(testId)) {
      out.push(toResolvedScenario(spec, id));
    }
  }
  return out;
}
