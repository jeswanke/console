import { Page, expect } from '@playwright/test';

export interface LoginOptions {
  consoleUrl: string;
  username: string;
  password: string;
  idp: string;
}

/**
 * Perform OpenShift OAuth login on the given page.
 * Handles both single-IdP and multi-IdP broker UIs.
 */
export async function openshiftLogin(page: Page, options: LoginOptions): Promise<void> {
  await page.goto(options.consoleUrl, { waitUntil: 'domcontentloaded' });

  const idpLink = page.getByRole('link', { name: options.idp });
  const usernameInput = page.getByRole('textbox', { name: 'Username' });
  const passwordInput = page.getByRole('textbox', { name: 'Password' });
  const submitButton = page.getByRole('button', { name: /log in/i });

  await expect(idpLink.or(usernameInput)).toBeVisible({ timeout: 30_000 });
  if (await idpLink.isVisible()) {
    await idpLink.click();
    await usernameInput.waitFor({ state: 'visible', timeout: 30_000 });
  }

  await usernameInput.fill(options.username);
  await passwordInput.fill(options.password);
  await expect(submitButton).toBeEnabled({ timeout: 10_000 });
  await submitButton.click();

  try {
    await page.waitForURL(
      (url) => !url.hostname.includes('oauth-openshift'),
      { timeout: 120_000 },
    );
    await page.waitForLoadState('domcontentloaded');
  } catch {
    const alertText = await page
      .locator('.pf-v6-c-alert, .alert-danger')
      .first()
      .textContent()
      .catch(() => '');
    throw new Error(
      `Login failed for "${options.username}" after 120s. ` +
        `URL: ${page.url()}. ` +
        (alertText ? `UI: ${alertText.trim()}. ` : '') +
        `Check credentials and IdP name "${options.idp}".`,
    );
  }
}
