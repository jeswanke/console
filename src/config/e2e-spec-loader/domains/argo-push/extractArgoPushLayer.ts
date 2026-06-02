import { isPlainObject } from '../../isPlainObject';

/**
 * Argo push slice from a fragment or profile: `specDomains.argoPush`, or top-level fields with `specDomains` stripped.
 */
export function extractArgoPushLayer(blob: Record<string, unknown>): Record<string, unknown> {
  const sd = blob.specDomains;
  if (isPlainObject(sd) && isPlainObject(sd.argoPush)) {
    return { ...sd.argoPush };
  }
  const rest = { ...blob };
  delete rest.specDomains;
  return rest;
}
