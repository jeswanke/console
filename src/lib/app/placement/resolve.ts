/**
 * Resolve active **Placement** CR name from subscription `placementRef`.
 */
import type { OcCliService } from '@services/OcCliService';

import { defaultPlacementCrName, defaultSubscriptionCrName } from '../topology/graph-ids';

/**
 * Resolves the active **Placement** CR for a subscription block — uses `placementRef` when present,
 * otherwise the wizard default (`{app}-placement-{blockIndex}`).
 */
export async function resolvePlacementCrNameForSubscriptionBlock(
  oc: OcCliService,
  namespace: string,
  applicationName: string,
  blockIndex = 1
): Promise<string> {
  const subscriptionCrName = defaultSubscriptionCrName(applicationName, blockIndex);
  const refName = await oc.getSubscriptionPlacementRefName(namespace, subscriptionCrName);
  return refName ?? defaultPlacementCrName(applicationName, blockIndex);
}
