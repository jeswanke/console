/**
 * RHACM4K-63608: Argo CD ApplicationSet push-model wizard — private Git repository.
 */
import { expect, type Page } from '@playwright/test';

import { APP_APPLICATION_DETAILS, APP_ARGO_PUSH_CREATE_WIZARD } from '@constants/app';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import type { OcCliService } from '@services/OcCliService';

import type { CreateArgoPushApplicationOptions } from './types';
import { verifyArgoPushAppTopologyTab } from '../verify/argo-push-topology-tab';
import { escapePathSegment } from '@lib/utils';
import type { TopologyClusterResourceRef } from '../topology/graph-ids';

/** Assert the private repository credentials info alert on the **Template** step. */
export async function verifyPrivateRepoCredentialsAlertOnTemplate(
  wizard: ArgoPushApplicationCreateWizardPage
): Promise<void> {
  await wizard.clickWizardStep(APP_ARGO_PUSH_CREATE_WIZARD.steps.template);
  await wizard.expectPrivateRepoCredentialsAlertVisible();
}

/** Opens GitOps repository settings from the alert and verifies the repos URL. */
export async function verifyConfigureRepositoryCredentialsOpensGitOpsSettings(
  wizard: ArgoPushApplicationCreateWizardPage,
  oc: OcCliService
): Promise<void> {
  const { gitOpsRepoSettingsPathSuffix } =
    APP_ARGO_PUSH_CREATE_WIZARD.template.privateRepoCredentialsAlert;

  const gitOpsHost = (
    await oc.run(
      'oc get route openshift-gitops-server -n openshift-gitops -o jsonpath="{.spec.host}"'
    )
  ).trim();
  const expectedPath = gitOpsRepoSettingsPathSuffix;

  const configureButton = wizard.getConfigureRepositoryCredentialsButton();
  await expect(configureButton).toBeEnabled({ timeout: 60_000 });

  const settingsPage = await wizard.openGitOpsRepositorySettingsFromAlert();
  try {
    await expect(settingsPage).toHaveURL(
      (url) => {
        try {
          const u = new URL(url);
          return u.hostname === gitOpsHost && u.pathname.endsWith(expectedPath);
        } catch {
          return false;
        }
      },
      { timeout: 60_000 }
    );
  } finally {
    await settingsPage.close().catch(() => undefined);
  }
}

/** Poll until push-model topology graph contains expected node `data-id`s. */
export async function verifyArgoPushPrivateRepoTopologyDeployed(
  detailsPage: ApplicationDetailsPage,
  options: {
    applicationSetName: string;
    argoServerNamespace: string;
    destinationNamespace: string;
    clusterResourceRows: TopologyClusterResourceRef[];
    page: Page;
    clusterName?: string;
    nodeHydrationTimeout?: number;
  }
): Promise<void> {
  await verifyArgoPushAppTopologyTab({
    page: options.page,
    detailsPage,
    applicationSetName: options.applicationSetName,
    argoServerNamespace: options.argoServerNamespace,
    destinationNamespace: options.destinationNamespace,
    clusterResourceRows: options.clusterResourceRows,
    clusterName: options.clusterName,
    nodeHydrationTimeout: options.nodeHydrationTimeout,
  });
}

/** Details tab smoke for a push-model ApplicationSet created from a private Git repo. */
export async function verifyArgoPushPrivateRepoDetailsTab(
  detailsPage: ApplicationDetailsPage,
  options: Pick<
    CreateArgoPushApplicationOptions,
    'applicationName' | 'argoServerLabel' | 'git'
  >
): Promise<void> {
  const { applicationName, argoServerLabel, git } = options;
  if (!git) throw new Error('verifyArgoPushPrivateRepoDetailsTab: git repository spec is required');

  await detailsPage.openDetailTab('details');
  await detailsPage.expectDetailTabSelected('details');

  await expect(detailsPage.getApplicationHeading()).toHaveText(applicationName, {
    timeout: 60_000,
  });
  await expect(detailsPage.getDescriptionValue('name')).toContainText(applicationName);
  await expect(detailsPage.getDescriptionValue('namespace')).toContainText(argoServerLabel);
  await expect(detailsPage.getDescriptionValue('repository')).toContainText(git.url);
}

/** Convenience wrapper when the caller only has `page` for URL checks. */
export async function expectArgoPushApplicationDetailsTabUrl(
  page: Page,
  argoServerNamespace: string,
  applicationSetName: string
): Promise<void> {
  const slug = APP_APPLICATION_DETAILS.tabs.details.slug;
  await expect(page).toHaveURL(
    new RegExp(
      `/multicloud/applications/details/${escapePathSegment(argoServerNamespace)}/${escapePathSegment(applicationSetName)}/${slug}(\\?|$)`
    )
  );
}
