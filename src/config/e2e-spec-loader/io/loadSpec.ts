import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

import { e2eSpecDataSchema, type E2eSpecData } from '../schema';
import { mergeE2eSpecData } from '../specFileMerge';

let cachedSourcePath: string | undefined;
let cachedParsed: E2eSpecData | undefined;

/** Default `src/config/e2e-spec-data/`; override with `E2E_SPECS_PATH`. */
export function defaultSpecDataPath(): string {
  return path.join(__dirname, '..', '..', 'e2e-spec-data');
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

function loadFromDirectory(dir: string): E2eSpecData {
  const files = listE2eSpecYamlFiles(dir);
  if (files.length === 0) {
    throw new Error(`e2e-spec-data: no YAML files found under "${dir}"`);
  }
  const parts: E2eSpecData[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    parts.push(e2eSpecDataSchema.parse(parseYaml(raw)));
  }
  return mergeE2eSpecData(parts);
}

function loadFromFile(file: string): E2eSpecData {
  const raw = fs.readFileSync(file, 'utf8');
  return e2eSpecDataSchema.parse(parseYaml(raw));
}

function resolveSource(configPath?: string): { source: string; load: () => E2eSpecData } {
  const p = configPath ?? process.env.E2E_SPECS_PATH ?? defaultSpecDataPath();
  if (isDirectory(p)) {
    return { source: p, load: () => loadFromDirectory(p) };
  }
  if (isFile(p)) {
    return { source: p, load: () => loadFromFile(p) };
  }
  throw new Error(
    `e2e-spec-data: E2E_SPECS_PATH / config path is not a file or directory: "${p}"`
  );
}

/** Parsed merged spec; cached per source path. */
export function loadE2eSpecData(configPath?: string): E2eSpecData {
  const { source, load } = resolveSource(configPath);
  if (cachedParsed && cachedSourcePath === source) {
    return cachedParsed;
  }
  const parsed = load();
  cachedSourcePath = source;
  cachedParsed = parsed;
  return parsed;
}

export function clearE2eSpecDataCache(): void {
  cachedSourcePath = undefined;
  cachedParsed = undefined;
}
