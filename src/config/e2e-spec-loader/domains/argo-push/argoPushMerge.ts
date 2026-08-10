import { isPlainObject } from '../../isPlainObject';

/** Last layer wins for scalars; `git` merges shallowly. */
export function mergeArgoPushLayers(
  ...layers: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  let acc: Record<string, unknown> = {};
  for (const layer of layers) {
    if (!layer) continue;
    const next = { ...acc };
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined) continue;
      if (key === 'git' && isPlainObject(value) && isPlainObject(next.git)) {
        next.git = { ...(next.git as Record<string, unknown>), ...value };
        continue;
      }
      if (key === 'helm' && isPlainObject(value) && isPlainObject(next.helm)) {
        next.helm = { ...(next.helm as Record<string, unknown>), ...value };
        continue;
      }
      next[key] = value;
    }
    acc = next;
  }
  return acc;
}
