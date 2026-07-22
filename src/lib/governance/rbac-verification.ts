/* Copyright Contributors to the Open Cluster Management project */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { SELECTORS } from '@constants/selectors';

export interface RbacPermissions {
  get: boolean;
  patch: boolean;
  create: boolean;
  delete: boolean;
}

export interface RbacUserConfig {
  username: string;
  permissions: RbacPermissions;
  expectedPolicyCount: number;
  namespaced: boolean;
  searchFilter: string;
  expectedNamespaces: string[];
}

export async function verifyPolicyListingPermissions(
  page: Page,
  consoleUrl: string,
  config: RbacUserConfig
): Promise<void> {
  await page.goto(`${consoleUrl}/multicloud/governance/policies`);
  await page.waitForLoadState('load');

  await page.getByRole('tab', { name: 'Policies', exact: true }).click();
  await page.waitForLoadState('load');

  const createButton = page.getByRole('link', { name: /Create policy/i });
  if (config.permissions.create) {
    await expect(createButton).toBeVisible({ timeout: 30_000 });
    await expect(createButton).not.toHaveAttribute('aria-disabled', 'true');
  } else {
    const isVisible = await createButton.isVisible().catch(() => false);
    if (isVisible) {
      await expect(createButton).toHaveAttribute('aria-disabled', 'true');
    }
  }

  const searchInput = page.locator(SELECTORS.common.searchInput);
  await searchInput.fill(config.searchFilter);

  const policyRows = page.locator('table tbody tr');
  await expect(policyRows).toHaveCount(config.expectedPolicyCount, { timeout: 30_000 });

  if (config.expectedPolicyCount > 0) {
    await verifyActionsMenuPermissions(page, config.permissions);
  }
}

async function verifyActionsMenuPermissions(
  page: Page,
  permissions: RbacPermissions
): Promise<void> {
  const kebab = page.locator('table tbody tr').first().locator('button[aria-label="Actions"]');
  await kebab.click();

  const disableItem = page
    .getByRole('menuitem', { name: /Disable/i })
    .or(page.getByRole('menuitem', { name: /Enable/i }));
  const enforceItem = page
    .getByRole('menuitem', { name: /Enforce/i })
    .or(page.getByRole('menuitem', { name: /Inform/i }));
  const editItem = page.getByRole('menuitem', { name: /Edit/i });
  const deleteItem = page.getByRole('menuitem', { name: /Delete/i });

  await expect(disableItem.first()).toBeVisible({ timeout: 10_000 });

  if (permissions.patch) {
    await expect(disableItem.first()).not.toHaveAttribute('aria-disabled', 'true');
    await expect(enforceItem.first()).not.toHaveAttribute('aria-disabled', 'true');
    await expect(editItem.first()).not.toHaveAttribute('aria-disabled', 'true');
  } else {
    await expect(disableItem.first()).toHaveAttribute('aria-disabled', 'true');
    await expect(enforceItem.first()).toHaveAttribute('aria-disabled', 'true');
    await expect(editItem.first()).toHaveAttribute('aria-disabled', 'true');
  }

  if (permissions.delete) {
    await expect(deleteItem.first()).not.toHaveAttribute('aria-disabled', 'true');
  } else {
    await expect(deleteItem.first()).toHaveAttribute('aria-disabled', 'true');
  }

  await page.keyboard.press('Escape');
}

export async function verifyPolicyDetailsPermissions(
  page: Page,
  consoleUrl: string,
  policyName: string,
  namespace: string,
  permissions: RbacPermissions
): Promise<void> {
  await page.goto(
    `${consoleUrl}/multicloud/governance/policies/details/${namespace}/${policyName}`
  );
  await page.waitForLoadState('load');
  await expect(page.getByText(policyName)).toBeVisible({ timeout: 60_000 });

  const actionsButton = page.locator('button[aria-label="Actions"]').first();
  if (permissions.patch) {
    await expect(actionsButton).toBeVisible({ timeout: 30_000 });
  }

  if (await actionsButton.isVisible().catch(() => false)) {
    await actionsButton.click();

    const editItem = page.getByRole('menuitem', { name: /Edit/i });
    const deleteItem = page.getByRole('menuitem', { name: /Delete/i });
    await expect(editItem.first()).toBeVisible({ timeout: 10_000 });

    if (permissions.patch) {
      await expect(editItem.first()).not.toHaveAttribute('aria-disabled', 'true');
    } else {
      await expect(editItem.first()).toHaveAttribute('aria-disabled', 'true');
    }

    if (permissions.delete) {
      await expect(deleteItem.first()).not.toHaveAttribute('aria-disabled', 'true');
    } else {
      await expect(deleteItem.first()).toHaveAttribute('aria-disabled', 'true');
    }

    await page.keyboard.press('Escape');
  }
}

export async function verifyPolicyResultsPage(
  page: Page,
  consoleUrl: string,
  policyName: string,
  namespace: string
): Promise<void> {
  await page.goto(
    `${consoleUrl}/multicloud/governance/policies/details/${namespace}/${policyName}/results`
  );
  await page.waitForLoadState('load');

  await expect(page.locator('table').or(page.getByText(/No cluster results/i))).toBeVisible({
    timeout: 60_000,
  });
}

export async function verifyPolicyCreatePage(
  page: Page,
  consoleUrl: string,
  permissions: RbacPermissions,
  expectedNamespaces: string[]
): Promise<string | null> {
  if (!permissions.create) return null;

  await page.goto(`${consoleUrl}/multicloud/governance/policies/create`);
  await page.waitForLoadState('load');

  const nsInput = page.locator('input[aria-label="Select namespace"]');
  await expect(nsInput).toBeVisible({ timeout: 30_000 });

  await nsInput.click();
  for (const ns of expectedNamespaces) {
    await expect(
      page.locator('.pf-v6-c-menu li').filter({ hasText: new RegExp(`^${ns}$`) })
    ).toBeVisible({ timeout: 10_000 });
  }
  await page.keyboard.press('Escape');

  return null;
}
