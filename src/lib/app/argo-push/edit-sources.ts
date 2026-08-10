import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import type { ArgoPushGitRepositorySpec, ArgoPushHelmRepositorySpec } from './types';

export type ArgoPushTemplateSourceType = 'git' | 'helm';

export type AddArgoPushTemplateSourceOptions =
  | { type: 'git'; git: ArgoPushGitRepositorySpec }
  | { type: 'helm'; helm: ArgoPushHelmRepositorySpec };

/** RHACM4K-37186 / 37191: Edit wizard → Template → remove Git or Helm source. */
export async function deleteApplicationSetSourceFromWizard(
  applicationListPage: ApplicationListPage,
  wizard: ArgoPushApplicationCreateWizardPage,
  applicationSetName: string,
  sourceType: ArgoPushTemplateSourceType
): Promise<void> {
  await wizard.openEditFromApplicationsList(applicationListPage, applicationSetName);
  await wizard.clickTemplateWizardStep();
  await wizard.removeTemplateSourceByType(sourceType);
  await wizard.advanceFromTemplateThroughSubmit();
}

/** RHACM4K-37187 / 37192: Edit wizard → Template → add Git or Helm source. */
export async function addApplicationSetSourceFromWizard(
  applicationListPage: ApplicationListPage,
  wizard: ArgoPushApplicationCreateWizardPage,
  applicationSetName: string,
  source: AddArgoPushTemplateSourceOptions
): Promise<void> {
  await wizard.openEditFromApplicationsList(applicationListPage, applicationSetName);
  await wizard.clickTemplateWizardStep();
  await wizard.addTemplateSource();

  if (source.type === 'git') {
    await wizard.fillGitOnLastTemplateSection(source.git);
  } else {
    await wizard.fillHelmOnLastTemplateSection(source.helm);
  }

  await wizard.advanceFromTemplateThroughSubmit();
}
