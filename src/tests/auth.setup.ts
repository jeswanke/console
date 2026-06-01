import { expect, test } from '@playwright/test';
import path from 'path';
import { getHubAuth } from '@config';
import { OcCliService } from '@services/OcCliService';
import { openshiftLogin } from '@lib/openshift-login';
import { PF_MASTHEAD } from '@constants/selectors';

const authFile = path.join(__dirname, '../../.auth/admin.json');

test('authenticate admin', async ({ page }) => {
  const consoleUrl = await new OcCliService().getConsoleUrl();
  const { hubUser, hubPassword, hubIdp } = getHubAuth();

  await openshiftLogin(page, {
    consoleUrl,
    username: hubUser,
    password: hubPassword,
    idp: hubIdp,
  });

  await expect(page.locator(PF_MASTHEAD)).toBeVisible({ timeout: 60_000 });
  await page.context().storageState({ path: authFile });
});
