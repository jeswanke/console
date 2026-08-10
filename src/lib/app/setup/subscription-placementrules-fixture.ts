import path from 'node:path';

import { APP_SUBSCRIPTION_ADMIN_PLACEMENTRULES } from '@constants/subscription-admin';
import { withHubOcLogin } from '@lib/cluster/hub-oc-login';
import type { OcCliService } from '@services/OcCliService';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

function templatePath(relativePath: string): string {
  return path.join(REPO_ROOT, relativePath);
}

/** Cypress `requireCreate()` — skip apply on `@post-restore` / `@post-upgrade` grep runs. */
export function shouldCreateSubscriptionAdminResourcesForRestore(tags: readonly string[]): boolean {
  const joined = tags.join(' ');
  return !joined.includes('@post-restore') && !joined.includes('@post-upgrade');
}

/** RHACM4K-41355 hub CLI apply for placementrules subscription app. */
export async function applySubscriptionPlacementrulesFixture(oc: OcCliService): Promise<void> {
  const { nsTemplateRelativePath, appTemplateRelativePath, namespace } =
    APP_SUBSCRIPTION_ADMIN_PLACEMENTRULES;

  await oc.applyYaml(templatePath(nsTemplateRelativePath));
  await oc.applyYaml(templatePath(appTemplateRelativePath));
  await oc.labelNamespaceForAlcTest(namespace);
}

/** RHACM4K-41355: apply fixture as rbac user when restore tags allow create. */
export async function ensureSubscriptionAdminPlacementrulesFixture(params: {
  oc: OcCliService;
  tags: readonly string[];
  rbacUser: string;
  rbacPassword: string;
}): Promise<void> {
  const { oc, tags, rbacUser, rbacPassword } = params;
  await withHubOcLogin(oc, rbacUser, rbacPassword, async () => {
    if (shouldCreateSubscriptionAdminResourcesForRestore(tags)) {
      await applySubscriptionPlacementrulesFixture(oc);
    }
  });
}
