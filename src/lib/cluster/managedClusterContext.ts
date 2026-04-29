import fs from 'fs';
import path from 'path';

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

/** First cluster in the file, if any (same order as the generator script). */
export function getPrimaryManagedCluster(
  ctx: ManagedClusterContextFile | undefined
): ManagedClusterEntry | undefined {
  return ctx?.managedClusters?.[0];
}
