/** Shallow merge for Flux domain layers (later keys win). */
export function mergeFluxLayers(
  ...layers: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  return Object.assign({}, ...layers.filter(Boolean));
}
