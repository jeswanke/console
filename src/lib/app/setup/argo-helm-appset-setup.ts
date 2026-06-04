import path from 'path';

import { APP_ARGO_HELM_APPSET } from '@constants/app';
import type { OcCliService } from '@services/OcCliService';

const SETUP_YAML_PATH = path.join(
  path.resolve(__dirname, '../../../..'),
  APP_ARGO_HELM_APPSET.setupYamlRelativePath
);

/** Apply RHACM4K-64417 hub fixtures (ApplicationSet + Placement). */
export async function applyArgoHelmAppsetSetup(oc: OcCliService): Promise<void> {
  await oc.applyYaml(SETUP_YAML_PATH);
}

/** Remove RHACM4K-64417 ApplicationSet and Placement (best effort). */
export async function cleanupArgoHelmAppsetSetup(oc: OcCliService): Promise<void> {
  await oc.deleteYaml(SETUP_YAML_PATH).catch(() => undefined);
}

/** Poll until the Placement reports AllDecisionsScheduled with at least one cluster. */
export async function waitForArgoHelmPlacementReady(
  oc: OcCliService,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 120_000;
  const { namespace, placementName } = APP_ARGO_HELM_APPSET;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const count = await oc.getPlacementDecisionClusterCount(namespace, placementName);
    if (count >= 1) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(
    `Timed out waiting for placement ${namespace}/${placementName} to schedule clusters`
  );
}
