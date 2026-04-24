/** `clusterResources` layers: rows concatenated per outer block index. */
export function mergeClusterResourceBlockArrays(
  base: unknown[][] | undefined,
  override: unknown[][] | undefined
): unknown[][] {
  const a = base ?? [];
  const b = override ?? [];
  const len = Math.max(a.length, b.length);
  const out: unknown[][] = [];
  for (let i = 0; i < len; i++) {
    const ai = Array.isArray(a[i]) ? [...(a[i] as unknown[])] : [];
    const bi = Array.isArray(b[i]) ? (b[i] as unknown[]) : [];
    out.push([...ai, ...bi]);
  }
  return out;
}

function mergeTwo(
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown> | undefined
): Record<string, unknown> {
  const b = base ?? {};
  const o = override ?? {};
  if (Object.keys(o).length === 0) {
    return { ...b };
  }

  const out: Record<string, unknown> = { ...b };

  if (Array.isArray(o.clusterResources)) {
    const cr = o.clusterResources as unknown[];
    const isNestedBlockList = cr.length === 0 || Array.isArray(cr[0]);
    if (isNestedBlockList) {
      out.clusterResources = mergeClusterResourceBlockArrays(
        b.clusterResources as unknown[][] | undefined,
        cr as unknown[][]
      );
    }
  }

  return out;
}

export function mergeApplicationExpectationsLayers(
  ...layers: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  return layers.reduce<Record<string, unknown>>((acc, lyr) => mergeTwo(acc, lyr), {});
}
