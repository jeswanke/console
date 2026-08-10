/** Flux slice from a fragment or profile (`specDomains.flux` or flat deploy fields). */
export function extractFluxLayer(blob: Record<string, unknown>): Record<string, unknown> {
  const specDomains = blob.specDomains;
  if (specDomains && typeof specDomains === 'object') {
    const flux = (specDomains as Record<string, unknown>).flux;
    if (flux && typeof flux === 'object' && Object.keys(flux as object).length > 0) {
      return flux as Record<string, unknown>;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { specDomains: _sd, ...rest } = blob;
  return rest;
}
