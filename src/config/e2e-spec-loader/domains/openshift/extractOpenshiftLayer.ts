/** OpenShift slice from a profile (`specDomains.openshift` or flat deploy fields). */
export function extractOpenshiftLayer(blob: Record<string, unknown>): Record<string, unknown> {
  const specDomains = blob.specDomains;
  if (specDomains && typeof specDomains === 'object') {
    const openshift = (specDomains as Record<string, unknown>).openshift;
    if (openshift && typeof openshift === 'object' && Object.keys(openshift as object).length > 0) {
      return openshift as Record<string, unknown>;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { specDomains: _sd, ...rest } = blob;
  return rest;
}
