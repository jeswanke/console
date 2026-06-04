import path from 'path';

import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import type { OcCliService } from '@services/OcCliService';

const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

/** Applies RHACM4K-64219 existing Placement fixture (`argoPush.setupYamlRelativePath`). */
export async function applyGitopsPlacementPreviewSetup(
  oc: OcCliService,
  options: Pick<CreateArgoPushApplicationOptions, 'setupYamlRelativePath'>
): Promise<void> {
  const relative = options.setupYamlRelativePath;
  if (!relative) {
    throw new Error('e2e-spec-data: argoPush.setupYamlRelativePath is required for RHACM4K-64219');
  }
  await oc.applyYaml(path.join(PROJECT_ROOT, relative));
}
