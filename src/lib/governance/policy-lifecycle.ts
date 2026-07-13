/* Copyright Contributors to the Open Cluster Management project */

import { OcCliService } from '@services/OcCliService';

export async function waitForPolicyPropagation(
  oc: OcCliService,
  name: string,
  namespace: string,
  timeoutMs = 120_000
): Promise<void> {
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const compliant = await oc.run(
        `oc get policy ${name} -n ${namespace} -o jsonpath='{.status.compliant}' 2>/dev/null || true`
      );
      if (compliant && compliant !== "''" && compliant !== '') return;
    } catch {
      // Policy may not exist yet or status not populated
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(`Policy ${namespace}/${name} did not propagate within ${timeoutMs / 1000}s`);
}
