import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import type { CreateSubscriptionOptions } from '@lib/subscription-create';
import { e2eSpecDataSchema } from './schema';
import { mergeE2eSpecData } from './specFileMerge';
import type { E2eSpecData } from './schema';
import { resolveScenarioDomains } from './domains/resolveScenarioDomains';

export interface ResolvedE2eScenario {
  readonly scenarioId: string;
  /** When `false`, excluded from “all enabled” listings. */
  readonly enabled: boolean;
  /** Polarion ids: explicit `tests` on scenario plus any matrix keys pointing here. */
  readonly testIds: string[];
  /**
   * Resolved, validated payloads keyed by domain name (e.g. `subscription` → {@link CreateSubscriptionOptions}).
   * Add resolvers in `domains/resolveScenarioDomains.ts` for new areas.
   */
  readonly domains: Record<string, unknown>;
}

let cachedSourcePath: string | undefined;
let cachedParsed: E2eSpecData | undefined;

/** Default directory: `src/config/e2e-spec-data/`. Override with `E2E_SPECS_PATH` (file or directory). */
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

/**
 * Stable load order: `applications/*.yaml` (sorted; typically `_shared.yaml` then `subscription.yaml`) → optional `matrix.yaml`.
 * `matrix.yaml` adds `spec.matrix` (testcase id → scenario id); omit it if you only use `scenario.tests`.
 */
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

/**
 * Read and validate merged e2e YAML. Default: `e2e-spec-data` directory (see {@link listE2eSpecYamlFiles}).
 * Set `E2E_SPECS_PATH` to a single `.yaml` file or a directory with the same layout.
 */
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

/** Clear cache (e.g. tests that swap config files). */
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

  const domains = resolveScenarioDomains(spec, scenarioId, scenarioBody);

  const matrixIds = collectMatrixTestIdsForScenario(spec, scenarioId);
  const testIds = [...new Set([...tests, ...matrixIds])].sort();

  return {
    scenarioId,
    enabled,
    testIds,
    domains,
  };
}

/**
 * Convenience: subscription domain payload (throws if missing or scenario did not resolve subscription).
 */
export function getSubscriptionDomainPayload(resolved: ResolvedE2eScenario): CreateSubscriptionOptions {
  const s = resolved.domains.subscription;
  if (s === undefined) {
    throw new Error(
      `e2e-spec-data: scenario "${resolved.scenarioId}" has no subscription domain payload`
    );
  }
  return s as CreateSubscriptionOptions;
}

/**
 * Single resolved scenario by id (throws if missing).
 */
export function getE2eScenario(scenarioId: string, configPath?: string): ResolvedE2eScenario {
  const spec = loadE2eSpecData(configPath);
  if (!spec.scenarios[scenarioId]) {
    throw new Error(`e2e-spec-data: scenario not found: "${scenarioId}"`);
  }
  return toResolvedScenario(spec, scenarioId);
}

/**
 * Polarion / testcase id → scenarios (Cypress `getTestData` style).
 *
 * - `testId === ''` — every **enabled** scenario that resolves without error.
 * - Otherwise — scenarios where `matrix[testId]` matches, or `scenario.tests` includes `testId`.
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
      } catch {
        /* skip invalid */
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
