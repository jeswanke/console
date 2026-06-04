import fs from 'fs';
import path from 'path';

/** Minimal `test` shape for `test.skip()` in ALC specs (avoids coupling to Playwright generics). */
export type PlaywrightTestSkip = {
  skip(condition: boolean, description?: string): void;
};

/** One entry from {@link ManagedClusterContextFile.managedClusters} (hub / QE script shape). */
export interface ManagedClusterEntry {
  name: string;
  api_url?: string;
  base_domain?: string;
  console_url?: string;
  username?: string;
  password?: string;
}

/** Written by `scripts/cluster/generate-managed-cluster-data.py` into `.auth/managedClusters.json`. */
export interface ManagedClusterContextFile {
  managedClusters: ManagedClusterEntry[];
}

const DEFAULT_RELATIVE = path.join('.auth', 'managedClusters.json');

/**
 * Path to the managed-cluster JSON. Override with **`MANAGED_CLUSTER_CONTEXT_PATH`** (absolute or cwd-relative).
 */
export function getManagedClusterContextPath(): string {
  const override = process.env.MANAGED_CLUSTER_CONTEXT_PATH?.trim();
  if (override) {
    return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
  }
  return path.join(process.cwd(), DEFAULT_RELATIVE);
}

/**
 * Loads **`managedClusters.json`** if present. Returns **`undefined`** if the file is missing (e.g. prep skipped
 * or failed before the file was written).
 */
export function loadManagedClusterContext(
  filePath: string = getManagedClusterContextPath()
): ManagedClusterContextFile | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    return undefined;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || !('managedClusters' in parsed)) {
    throw new Error(`Invalid managed cluster context file: ${filePath}`);
  }
  const mc = (parsed as ManagedClusterContextFile).managedClusters;
  if (!Array.isArray(mc)) {
    throw new Error(`Invalid managedClusters array in: ${filePath}`);
  }
  return parsed as ManagedClusterContextFile;
}

/** Hub + managed clusters for placement-preview labeling (always includes `local-cluster`). */
export function managedClusterNamesForPreview(): string[] {
  const names = new Set<string>(['local-cluster']);
  for (const entry of loadManagedClusterContext()?.managedClusters ?? []) {
    if (entry?.name) names.add(entry.name);
  }
  return [...names];
}

/** First cluster in the file, if any (same order as the generator script). */
export function getPrimaryManagedCluster(
  ctx: ManagedClusterContextFile | undefined
): ManagedClusterEntry | undefined {
  return ctx?.managedClusters?.[0];
}

/** `test.skip()` when `.auth/managedClusters.json` has no clusters; returns the primary entry when present. */
export function skipUnlessPrimaryManagedCluster(
  test: PlaywrightTestSkip,
  ctx: ManagedClusterContextFile | undefined,
  contextLabel = 'Managed cluster ALC test'
): ManagedClusterEntry | undefined {
  const entry = getPrimaryManagedCluster(ctx);
  if (!entry?.name?.trim()) {
    test.skip(
      true,
      `${contextLabel}: no managed cluster in managedClusters.json (run globalSetup cluster prep or set MANAGED_CLUSTER_CONTEXT_PATH)`
    );
    return undefined;
  }
  return entry;
}
