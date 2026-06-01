import { expect } from '@playwright/test';

import type { OcCliService } from '@services/OcCliService';

/**
 * Polls until `oc get <resource> -n <namespace>` stdout contains the expected substring.
 * Use after UI changes when workload rollout may lag.
 */
export async function expectOcGetListContains(
  oc: OcCliService,
  params: {
    resource: string;
    namespace: string;
    expectedSubstring: string;
    timeout?: number;
    intervals?: number[];
  }
): Promise<void> {
  const {
    resource,
    namespace,
    expectedSubstring,
    timeout = 180_000,
    intervals = [2_000, 5_000, 10_000],
  } = params;

  await expect
    .poll(async () => oc.getNamespacedResourceList(resource, namespace), {
      timeout,
      intervals,
      message: `Expected oc get ${resource} -n ${namespace} to include ${JSON.stringify(expectedSubstring)}`,
    })
    .toContain(expectedSubstring);
}
