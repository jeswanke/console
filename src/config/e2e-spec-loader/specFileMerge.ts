import type { E2eSpecData } from './schema';
import { e2eSpecDataSchema } from './schema';

/** Later files override duplicate keys in `fragments`, `profiles`, `scenarios`, and `matrix`. */
export function mergeE2eSpecData(parts: E2eSpecData[]): E2eSpecData {
  if (parts.length === 0) {
    return e2eSpecDataSchema.parse({});
  }
  const merged: Record<string, unknown> = {};
  for (const p of parts) {
    if (p.version !== undefined) {
      merged.version = p.version;
    }
    merged.fragments = { ...(merged.fragments as object), ...p.fragments };
    merged.profiles = { ...(merged.profiles as object), ...p.profiles };
    merged.scenarios = { ...(merged.scenarios as object), ...p.scenarios };
    merged.matrix = { ...(merged.matrix as object), ...p.matrix };
  }
  return e2eSpecDataSchema.parse(merged);
}
