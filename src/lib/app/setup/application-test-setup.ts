import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { OcCliService } from '@services/OcCliService';

/**
 * Ensures a clean slate for serial ALC tests that reuse fixed app names from e2e-spec-data:
 * if the Application CR exists, deletes via UI (including namespace cleanup per list-page helper).
 */
export async function deleteHubApplicationIfExists(options: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  namespace: string;
  applicationName: string;
}): Promise<void> {
  const { oc, applicationListPage, namespace, applicationName } = options;
  if (!(await oc.applicationsAppK8sIoExists(namespace, applicationName))) {
    return;
  }
  await applicationListPage.goto();
  await applicationListPage.deleteApplicationFromOverviewViaSearch({
    applicationName,
    namespace,
    removeRelatedResources: true,
  });
}
