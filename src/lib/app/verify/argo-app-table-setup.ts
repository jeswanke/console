/**
 * Cypress `before` / `afterEach` for Argo_App_Table_Test_Suite (6902 / 6903 shared apps).
 */
import type { Page } from '@playwright/test';
import { resolveArgoPushScenarioById, resolveSubscriptionScenarioById } from '@config';
import { createArgoPushApplicationIfMissing } from '@lib/app/argo-push';
import type { CreateArgoPushApplicationOptions } from '@lib/app/argo-push/types';
import { cleanupArgoPushApplication } from '@lib/app/argo-push/cleanup';
import { createSubscription } from '@lib/app/subscription';
import type { CreateSubscriptionOptions } from '@lib/app/subscription/types';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPushApplicationCreateWizardPage } from '@pages/app/ArgoPushApplicationCreateWizardPage';
import type { SubscriptionApplicationCreateWizardPage } from '@pages/app/SubscriptionApplicationCreateWizardPage';
import type { OcCliService } from '@services/OcCliService';

export const ARGO_APP_TABLE_MATCHING_LABEL = {
  key: 'test',
  value: 'auto',
} as const;

export async function cleanupArgoAppTableTestApplications(
  oc: OcCliService,
  argoPush: CreateArgoPushApplicationOptions,
  subscription: CreateSubscriptionOptions
): Promise<void> {
  await cleanupArgoPushApplication(oc, argoPush);

  const { applicationName, namespace } = subscription;
  if (await oc.applicationsAppK8sIoExists(namespace, applicationName)) {
    await oc.deleteApplicationsAppK8sIo(namespace, applicationName);
  }
  await oc.deleteNamespace(namespace);
}

/** Cypress `before()` label on `local-cluster` for helloworld-argo matching label placement. */
export async function ensureLocalClusterMatchingLabelForArgoAppTable(
  oc: OcCliService,
  labelKey: string,
  labelValue: string
): Promise<void> {
  await oc.labelManagedCluster('local-cluster', labelKey, labelValue);
}

/** RHACM4K-6902 / 6903: label local-cluster, create AppSet + subscription if missing. */
export async function ensureArgoAppTableFixtures(params: {
  oc: OcCliService;
  applicationListPage: ApplicationListPage;
  argoPushApplicationCreateWizardPage: ArgoPushApplicationCreateWizardPage;
  subscriptionApplicationCreateWizardPage: SubscriptionApplicationCreateWizardPage;
  page: Page;
}): Promise<{
  argoPush: CreateArgoPushApplicationOptions;
  subscription: CreateSubscriptionOptions;
}> {
  const {
    oc,
    applicationListPage,
    argoPushApplicationCreateWizardPage,
    subscriptionApplicationCreateWizardPage,
    page,
  } = params;
  const { argoPush } = resolveArgoPushScenarioById('argo_app_table_helloworld_argo_auto');
  const { subscription } = resolveSubscriptionScenarioById('auto_git_multi');

  await ensureLocalClusterMatchingLabelForArgoAppTable(
    oc,
    ARGO_APP_TABLE_MATCHING_LABEL.key,
    ARGO_APP_TABLE_MATCHING_LABEL.value
  );

  await createArgoPushApplicationIfMissing(
    oc,
    applicationListPage,
    argoPushApplicationCreateWizardPage,
    page,
    argoPush
  );

  const subscriptionExists = await oc.applicationsAppK8sIoExists(
    subscription.namespace,
    subscription.applicationName
  );
  if (!subscriptionExists) {
    await applicationListPage.goto();
    await createSubscription(
      applicationListPage,
      subscriptionApplicationCreateWizardPage,
      page,
      subscription
    );
  }

  return { argoPush, subscription };
}
