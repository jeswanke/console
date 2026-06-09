import path from 'path';

import { GIT_PLACEMENTRULE_NO_NAME_TEST } from '@constants/app';
import type { OcCliService } from '@services/OcCliService';

const SETUP_YAML_PATH = path.join(
  path.resolve(__dirname, '../../../..'),
  GIT_PLACEMENTRULE_NO_NAME_TEST.setupYamlRelativePath
);

/** RHACM4K-49630 — subscription with `placementRef.kind` only (no name) + legacy PlacementRule. */
export async function applyGitPlacementRuleNoNameFixture(oc: OcCliService): Promise<void> {
  await oc.deleteNamespace(GIT_PLACEMENTRULE_NO_NAME_TEST.namespace).catch(() => undefined);
  await oc.applyYaml(SETUP_YAML_PATH);
}

/** Remove the RHACM4K-49630 application namespace (channel ns is shared; left as in Cypress). */
export async function cleanupGitPlacementRuleNoNameFixture(oc: OcCliService): Promise<void> {
  await oc.deleteNamespace(GIT_PLACEMENTRULE_NO_NAME_TEST.namespace).catch(() => undefined);
}
