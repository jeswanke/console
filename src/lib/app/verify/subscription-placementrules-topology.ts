import { expect, type Page } from '@playwright/test';

import { APP_SUBSCRIPTION_ADMIN_PLACEMENTRULES } from '@constants/subscription-admin';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';

/**
 * RHACM4K-41355: Placementrule topology node lists namespaces in the details table.
 * Cypress clicks the SVG label "Placementrule" and asserts placement5/6 rows map to placement1.
 */
export async function verifySubscriptionPlacementrulesTopologyDetails(
  applicationDetailsPage: ApplicationDetailsPage,
  page: Page
): Promise<void> {
  const { applicationName, namespace, placementRuleRows } = APP_SUBSCRIPTION_ADMIN_PLACEMENTRULES;

  await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
  await applicationDetailsPage.expectTopologyGraphVisible();

  const placementRuleNode = page
    .locator('[data-type="graph"]')
    .getByText(/Placementrule/i)
    .first();
  await placementRuleNode.waitFor({ state: 'visible', timeout: 120_000 });
  await placementRuleNode.click({ force: true });
  await applicationDetailsPage.waitForLoad();

  const details = page.locator('.topologyDetails');
  await expect(details).toBeVisible({ timeout: 60_000 });

  for (const row of placementRuleRows) {
    const ruleCell = details.locator('td').filter({ hasText: row.placementRuleName }).first();
    await expect(ruleCell).toBeVisible({ timeout: 60_000 });
    const namespaceCell = ruleCell.locator('xpath=preceding-sibling::td[1]');
    await expect(namespaceCell).toContainText(row.expectedNamespace);
  }
}
