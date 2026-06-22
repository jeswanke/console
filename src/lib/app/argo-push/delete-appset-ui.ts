import { expect } from '@playwright/test';

import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';

/** RHACM4K-37193: Applications list → Actions → Delete → remove related resources. */
export async function deleteApplicationSetFromList(
  applicationListPage: ApplicationListPage,
  oc: OcCliService,
  applicationSetName: string,
  options?: { argoServerNamespace?: string; removeRelatedResources?: boolean }
): Promise<void> {
  const argoServerNamespace = options?.argoServerNamespace ?? 'openshift-gitops';
  const removeRelatedResources = options?.removeRelatedResources !== false;
  const table = applicationListPage.applicationsTable;

  await applicationListPage.goto();
  await table.search(applicationSetName);
  const row = table.getRowByName(applicationSetName);
  await table.openRowActions(row);
  await table.clickDeleteMenuItem();
  await table.confirmDeleteApplicationModal({ removeRelatedResources });

  await expect
    .poll(() => oc.applicationSetExists(argoServerNamespace, applicationSetName), {
      timeout: 60_000,
      intervals: [1_000, 2_000, 3_000],
    })
    .toBe(false);
}
