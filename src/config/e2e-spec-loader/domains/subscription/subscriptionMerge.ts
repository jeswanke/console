/**
 * Merge rules for **subscription** domain payloads (CreateSubscriptionOptions-shaped layers).
 * Matches `mergePerBlockSpec` behavior in `subscription-create.ts` for `perBlock` arrays.
 */

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** One row of `perBlock` — shallow merge per section, weekdays merged. */
export function mergePerBlockLayers(
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown> | undefined
): Record<string, unknown> {
  const b = base ?? {};
  const o = override ?? {};
  const bt = b.timeWindow as Record<string, unknown> | undefined;
  const ot = o.timeWindow as Record<string, unknown> | undefined;
  const bwd = bt?.weekdays as Record<string, boolean> | undefined;
  const owd = ot?.weekdays as Record<string, boolean> | undefined;
  return {
    clusterDeployment: { ...(b.clusterDeployment as object), ...(o.clusterDeployment as object) },
    timeWindow: {
      ...bt,
      ...ot,
      weekdays: { ...bwd, ...owd },
    },
    automation: { ...(b.automation as object), ...(o.automation as object) },
  };
}

export function mergePerBlockArrays(base: unknown[] | undefined, override: unknown[] | undefined): unknown[] {
  const a = base ?? [];
  const b = override ?? [];
  const len = Math.max(a.length, b.length);
  const out: unknown[] = [];
  for (let i = 0; i < len; i++) {
    const ai = a[i];
    const bi = b[i];
    out.push(
      mergePerBlockLayers(
        isPlainObject(ai) ? ai : undefined,
        isPlainObject(bi) ? bi : undefined
      )
    );
  }
  return out;
}

/**
 * Merge subscription-shaped layers (fragments → profiles → scenario).
 * `repositories` is **replaced** when the top layer defines it.
 * `perBlock` arrays are merged index-wise via {@link mergePerBlockArrays}.
 */
export function mergeSubscriptionLayers(
  ...layers: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  let acc: Record<string, unknown> = {};
  for (const layer of layers) {
    if (!layer) continue;
    const next = { ...acc };
    for (const key of Object.keys(layer)) {
      const v = layer[key];
      if (v === undefined) continue;
      if (key === 'repositories' && Array.isArray(v)) {
        next[key] = v;
        continue;
      }
      if (key === 'perBlock' && Array.isArray(v)) {
        const prev = next[key];
        next[key] = mergePerBlockArrays(
          Array.isArray(prev) ? prev : undefined,
          v
        );
        continue;
      }
      if (isPlainObject(v) && isPlainObject(next[key])) {
        next[key] = mergeSubscriptionLayers(next[key] as Record<string, unknown>, v);
        continue;
      }
      next[key] = v;
    }
    acc = next;
  }
  return acc;
}
