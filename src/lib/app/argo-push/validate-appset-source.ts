import type { OcCliService } from '@services/OcCliService';

/** Cypress `validateApplicationSetSource` — checks `spec.template.spec.sources` for `repoURL`. */
export async function validateApplicationSetSourceRepoUrl(
  oc: OcCliService,
  options: {
    namespace: string;
    applicationSetName: string;
    repoUrl: string;
    shouldBePresent: boolean;
  }
): Promise<void> {
  const { namespace, applicationSetName, repoUrl, shouldBePresent } = options;
  const present = await oc.applicationSetHasSourceRepoUrl(namespace, applicationSetName, repoUrl);
  if (shouldBePresent && !present) {
    throw new Error(
      `validateApplicationSetSourceRepoUrl: expected repoURL ${repoUrl} in ApplicationSet ${namespace}/${applicationSetName}`
    );
  }
  if (!shouldBePresent && present) {
    throw new Error(
      `validateApplicationSetSourceRepoUrl: unexpected repoURL ${repoUrl} in ApplicationSet ${namespace}/${applicationSetName}`
    );
  }
}
