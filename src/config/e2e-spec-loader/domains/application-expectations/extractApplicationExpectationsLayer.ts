import { isPlainObject } from '../../isPlainObject';

export function extractApplicationExpectationsLayer(blob: Record<string, unknown>): Record<string, unknown> {
  const sd = blob.specDomains;
  if (isPlainObject(sd) && isPlainObject(sd.applicationExpectations)) {
    return { ...sd.applicationExpectations };
  }
  return {};
}
