import { test } from '@playwright/test';
import path from 'path';
import { getRbacUsers } from '@config';
import { OcCliService } from '@services/OcCliService';
import { openshiftLogin } from '@lib/openshift-login';

const authDir = path.join(__dirname, '../../.auth');
const domain = process.env.RBAC_DOMAIN;
const rbacUsers = getRbacUsers(domain);

if (domain && rbacUsers.length === 0) {
  throw new Error(`No RBAC users configured for RBAC_DOMAIN="${domain}". Check src/config/presets.ts.`);
}

for (const user of rbacUsers) {
  test(`authenticate ${user.role}`, async ({ page }) => {
    test.skip(!process.env.RBAC_TEST_PASSWORD, 'RBAC_TEST_PASSWORD not set');

    const consoleUrl = await new OcCliService().getConsoleUrl();

    await openshiftLogin(page, {
      consoleUrl,
      username: user.username,
      password: user.password,
      idp: user.idp,
    });

    await page.context().storageState({
      path: path.join(authDir, `${user.role}.json`),
    });
  });
}
