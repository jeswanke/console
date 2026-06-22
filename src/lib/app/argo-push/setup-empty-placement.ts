import path from 'node:path';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import type { OcCliService } from '@services/OcCliService';
import { createArgoPushApplicationIfMissing } from './create-if-missing';
import { resolveApplicationSetNamespace } from './namespace';
import { validateApplicationSetSourceRepoUrl } from './validate-appset-source';
import type { CreateArgoPushApplicationOptions } from './types';

/** RHACM4K-40996: apply empty-placement GitOpsCluster, create AppSet on `empty-placement-cluster`. */
export async function setupEmptyPlacementApplicationSet(
  oc: OcCliService,
  applicationListPage: ApplicationListPage,
  wizard: ArgoPushApplicationCreateWizardPage,
  options: CreateArgoPushApplicationOptions,
  projectRoot: string
): Promise<void> {
  if (options.setupYamlRelativePath) {
    await oc.applyYaml(path.join(projectRoot, options.setupYamlRelativePath));
  }

  await applicationListPage.goto();
  await createArgoPushApplicationIfMissing(oc, applicationListPage, wizard, options);

  await validateApplicationSetSourceRepoUrl(oc, {
    namespace: resolveApplicationSetNamespace(options),
    applicationSetName: options.applicationName,
    repoUrl: options.git.url,
    shouldBePresent: true,
  });
}
