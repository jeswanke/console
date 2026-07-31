/**
 * Cluster add-ons — verify addon table on cluster detail and addon chart on overview.
 *
 * Runs against local-cluster (always available on any hub).
 * Migrated from: clc-ui-e2e/cypress/tests/clusters/managedClusters/clusterAddons.spec.js
 */
import { test, expect } from '@fixtures/acm-test';

const CLUSTER_NAME = 'local-cluster';

test.describe('Cluster Addons', { tag: ['@cluster', '@clc', '@addons'] }, () => {
  test(
    'RHACM4K-1584: Verify addons on cluster detail page',
    { tag: ['@RHACM4K-1584'] },
    async ({ clusterAddonsPage }) => {
      await test.step('Navigate to Add-ons tab', async () => {
        await clusterAddonsPage.goto(CLUSTER_NAME, CLUSTER_NAME);
      });

      await test.step('Verify addon table has entries', async () => {
        const count = await clusterAddonsPage.getAddonCount();
        expect(count).toBeGreaterThan(0);
      });

      await test.step('Verify known addons are present with status', async () => {
        await clusterAddonsPage.verifyAddonVisible('application-manager');
        const status = await clusterAddonsPage.getAddonStatus('application-manager');
        expect(status).toBeTruthy();
      });
    }
  );

  test(
    'RHACM4K-29240: Overview page addon chart',
    { tag: ['@RHACM4K-29240'] },
    async ({ page, oc }) => {
      await test.step('Navigate to overview page', async () => {
        const consoleUrl = await oc.getConsoleUrl();
        await page.goto(`${consoleUrl}/multicloud/home/overview`);
      });

      await test.step('Verify addon chart is visible', async () => {
        const chart = page.locator('#cluster-add-ons-chart');
        await expect(chart).toBeVisible({ timeout: 30_000 });
        await expect(
          page.locator('#cluster-add-ons-chart-title')
        ).toContainText('Cluster add-ons');
      });

      const addonStates = ['Available', 'Degraded', 'Progressing', 'Unknown'];

      for (const state of addonStates) {
        await test.step(`Verify ${state} link navigates correctly`, async () => {
          const link = page.locator('#cluster-add-ons-chart').getByRole('link', { name: new RegExp(state) });
          await expect(link).toBeVisible();

          const href = await link.getAttribute('href');
          expect(href).toContain(`/multicloud/infrastructure/clusters/managed?add-ons=${state}`);
        });
      }

      await test.step('Click Available link and verify navigation', async () => {
        const availableLink = page.locator('#cluster-add-ons-chart').getByRole('link', { name: /Available/ });
        await availableLink.click();
        await expect(page).toHaveURL(/add-ons=Available/);
      });
    }
  );
});
