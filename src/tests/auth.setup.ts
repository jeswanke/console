import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { getHubAuth } from '@config';
import { OcCliService } from '@services/OcCliService';
import { PF_MASTHEAD } from '@constants/selectors';

const authFile = path.join(__dirname, '../../.auth/user.json');

setup('authenticate', async ({ page }) => {
  const oc = new OcCliService();
  const consoleUrl = await oc.getConsoleUrl();
  const { hubUser: username, hubPassword: password, hubIdp: idp } = getHubAuth();

  // Navigate to console (redirects to OAuth)
  await page.goto(consoleUrl);

  // Select IDP and login
  await page.getByRole('link', { name: idp }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for console to fully load (login can be slow - use explicit timeout)
  await expect(page.locator(PF_MASTHEAD)).toBeVisible({ timeout: 30000 });

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
