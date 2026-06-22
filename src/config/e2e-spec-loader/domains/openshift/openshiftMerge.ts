/** Shallow merge for OpenShift domain layers (later keys win). */
export function mergeOpenshiftLayers(
  ...layers: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  return Object.assign({}, ...layers.filter(Boolean));
}
