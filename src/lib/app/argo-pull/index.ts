import path from 'node:path';

import type { Page } from '@playwright/test';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPullApplicationCreateWizardPage } from '@pages/app/ArgoPullApplicationCreateWizardPage';

import {
  createArgoPushApplication,
  waitForArgoPushApplicationAfterCreate,
} from '../argo-push/create';
import { cleanupArgoPushApplication } from '../argo-push/cleanup';
import type { CreateArgoPushApplicationOptions } from '../argo-push/types';

export type { CreateArgoPushApplicationOptions as CreateArgoPullApplicationOptions } from '../argo-push/types';

/** Fills and submits the pull-model ApplicationSet wizard (Git or Helm template). */
export async function createArgoPullApplication(
  applicationListPage: ApplicationListPage,
  wizard: ArgoPullApplicationCreateWizardPage,
  page: Page,
  options: CreateArgoPushApplicationOptions
): Promise<{ argoServerNamespace: string }> {
  return createArgoPushApplication(applicationListPage, wizard, page, options);
}

export { waitForArgoPushApplicationAfterCreate as waitForArgoPullApplicationAfterCreate };

export async function cleanupArgoPullApplication(
  oc: ArgoPullApplicationCreateWizardPage['oc'],
  options: CreateArgoPushApplicationOptions
): Promise<void> {
  return cleanupArgoPushApplication(oc, options);
}

const REPO_ROOT = path.resolve(__dirname, '../../../..');

export function pullModelTemplatePath(relativePath: string): string {
  return path.join(REPO_ROOT, relativePath);
}
