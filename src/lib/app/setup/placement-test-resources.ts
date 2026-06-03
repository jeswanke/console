import path from 'path';

import { PLACEMENT_TEST_RESOURCES } from '@constants/app';
import type { OcCliService } from '@services/OcCliService';

const SETUP_YAML_PATH = path.join(
  path.resolve(__dirname, '../../../..'),
  PLACEMENT_TEST_RESOURCES.setupYamlRelativePath
);

/** Apply RHACM4K-64215 hub fixtures (namespace, Placement, ManagedClusterSetBinding, legacy PlacementRule). */
export async function applyPlacementTestResources(oc: OcCliService): Promise<void> {
  await oc.deleteNamespace(PLACEMENT_TEST_RESOURCES.namespace).catch(() => undefined);
  await oc.applyYaml(SETUP_YAML_PATH);
}

/** Remove the RHACM4K-64215 test namespace and all seeded resources. */
export async function cleanupPlacementTestResources(oc: OcCliService): Promise<void> {
  await oc.deleteNamespace(PLACEMENT_TEST_RESOURCES.namespace).catch(() => undefined);
}
