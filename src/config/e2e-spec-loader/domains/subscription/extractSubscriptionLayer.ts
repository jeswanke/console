import { isPlainObject } from '../../isPlainObject';

/**
 * Subscription slice from a fragment or profile: `specDomains.subscription`, or top-level fields with `specDomains` stripped
 * (so `applicationExpectations` is not pulled into the subscription merge).
 */
export function extractSubscriptionLayer(blob: Record<string, unknown>): Record<string, unknown> {
  const sd = blob.specDomains;
  if (isPlainObject(sd) && isPlainObject(sd.subscription)) {
    return { ...sd.subscription };
  }
  const rest = { ...blob };
  delete rest.specDomains;
  return rest;
}
