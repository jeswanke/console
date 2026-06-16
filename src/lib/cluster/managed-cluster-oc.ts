import type { OcCliService } from '@services/OcCliService';

/** Run `fn` on a managed cluster context, then restore the prior hub/spoke context. */
export async function withManagedClusterContext<T>(
  oc: OcCliService,
  managedClusterName: string,
  fn: () => Promise<T>
): Promise<T> {
  const priorContext = await oc.getCurrentContext();
  try {
    await oc.useContext(managedClusterName);
    return await fn();
  } finally {
    await oc.useContext(priorContext);
  }
}
