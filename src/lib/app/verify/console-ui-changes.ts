import { APP_CONSOLE_UI_CHANNEL_COPY } from '@constants/app';
import {
  applyConsoleUiCopyGitApp,
  applyConsoleUiCopyHelmApp,
  deleteConsoleUiCopyGitApp,
  deleteConsoleUiCopyHelmApp,
} from '@lib/app/setup/console-ui-copy-apps';
import { verifyPlacementDeprecationAlertForRepositoryTypes } from '@lib/app/subscription/placement-wizard-verify';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';
import type { OcCliService } from '@services/OcCliService';

/** RHACM4K-31501 — subscription create wizard shows placement rule deprecation for all repository types. */
export async function runConsoleUiPlacementDeprecationScenario(params: {
  applicationListPage: ApplicationListPage;
  wizard: SubscriptionApplicationCreateWizardPage;
}): Promise<void> {
  const { applicationListPage, wizard } = params;
  await wizard.openFromApplicationsList(applicationListPage);
  await wizard.collapseYamlEditor();
  await verifyPlacementDeprecationAlertForRepositoryTypes(wizard);
}

/** RHACM4K-32401 — git/helm channel links on Advanced configuration copy repository path. */
export async function runConsoleUiChannelCopyLinksScenario(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
}): Promise<void> {
  const { oc, applicationListPage } = params;
  const git = APP_CONSOLE_UI_CHANNEL_COPY.git;
  const helm = APP_CONSOLE_UI_CHANNEL_COPY.helm;

  await applyConsoleUiCopyGitApp(oc);
  await applicationListPage.verifyAdvancedConfigChannelCopyLink({
    channelSearchSubstring: git.channelSearch,
    channelRepositoryUrl: git.channelRepositoryUrl,
    channelRepositoryTypeLabel: git.channelRepositoryTypeLabel,
  });
  await deleteConsoleUiCopyGitApp(oc);

  await applyConsoleUiCopyHelmApp(oc);
  await applicationListPage.verifyAdvancedConfigChannelCopyLink({
    channelSearchSubstring: helm.channelSearch,
    channelRepositoryUrl: helm.channelRepositoryUrl,
    channelRepositoryTypeLabel: helm.channelRepositoryTypeLabel,
  });
  await deleteConsoleUiCopyHelmApp(oc);
}
