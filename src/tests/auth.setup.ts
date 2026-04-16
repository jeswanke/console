import { expect, test } from '@playwright/test';
import path from 'path';
import { getHubAuth } from '@config';
import { OcCliService } from '@services/OcCliService';
import { PF_MASTHEAD } from '@constants/selectors';

const authFile = path.join(__dirname, '../../.auth/user.json');

/** Successful console login leaves the OAuth broker host (see oauth-openshift / login pages). */
function leftOauthBroker(url: URL): boolean {
  return !url.hostname.includes('oauth-openshift');
}

test('authenticate', async ({ page }) => {
  const oc = new OcCliService();
  const consoleUrl = await oc.getConsoleUrl();
  const { hubUser: username, hubPassword: password, hubIdp: idp } = getHubAuth();

  // Navigate to console (redirects to OAuth)
  await page.goto(consoleUrl, { waitUntil: 'domcontentloaded' });

  // Prefer a11y locators — broker UIs match Playwright snapshots (textbox "Username") even when #inputUsername is absent.
  const idpLink = page.getByRole('link', { name: idp });
  const usernameInput = page.getByRole('textbox', { name: 'Username' });
  const passwordInput = page.getByRole('textbox', { name: 'Password' });
  const submitButton = page.getByRole('button', { name: /log in/i });

  // Multi-IdP: IdP links appear first. Single-IdP: username field is already shown. Never assume IdP exists.
  await expect(idpLink.or(usernameInput)).toBeVisible({ timeout: 30_000 });
  if (await idpLink.isVisible()) {
    await idpLink.click();
    await usernameInput.waitFor({ state: 'visible', timeout: 30_000 });
  }
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  // Broker keeps Log in disabled until both fields are non-empty.
  await expect(submitButton).toBeEnabled({ timeout: 10000 });

  await submitButton.click();

  try {
    await page.waitForURL(leftOauthBroker, { timeout: 120_000 });
  } catch {
    const alertText = await page
      .locator('.pf-v6-c-alert, .alert-danger')
      .first()
      .textContent()
      .catch(() => '');
    throw new Error(
      `Console login did not leave OAuth broker within 120s. ` +
        `URL: ${page.url()}. ` +
        (alertText ? `UI message: ${alertText.trim()}. ` : '') +
        `Check CONSOLE_USERNAME and HUB_PASSWORD (same as oc login).`
    );
  }

  await expect(page.locator(PF_MASTHEAD)).toBeVisible({ timeout: 60_000 });

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
