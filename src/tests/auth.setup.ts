import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { OcCliService } from '@services/OcCliService';

const authFile = path.join(__dirname, '../../.auth/user.json');

setup('authenticate', async ({ page }) => {
  const oc = new OcCliService();
  const consoleUrl = await oc.getConsoleUrl();
  
  const username = process.env.OPTIONS_HUB_USER || 'kubeadmin';
  const password = process.env.OPTIONS_HUB_PASSWORD;
  const idp = process.env.OPTIONS_HUB_IDP || 'kube:admin';

  if (!password) {
    throw new Error('OPTIONS_HUB_PASSWORD is required');
  }

  console.log(`Logging in as ${username} via ${idp}...`);

  // Go to console - redirects to OAuth
  await page.goto(consoleUrl);
  
  // Click IDP
  await page.getByRole('link', { name: idp }).click();
  
  // Fill credentials
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for console to load
  await expect(page.locator('.pf-v6-c-masthead, .pf-c-masthead, .co-masthead')).toBeVisible({ timeout: 30000 });
  
  console.log('Login successful!');

  // Save state
  await page.context().storageState({ path: authFile });
  
  const cookies = await page.context().cookies();
  console.log(`Saved ${cookies.length} cookies including: ${cookies.map(c => c.name).join(', ')}`);
});
