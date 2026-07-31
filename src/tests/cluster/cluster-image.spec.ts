/**
 * Cluster image — verify only supported OCP release versions are shown in the create wizard.
 *
 * Validates that the release image dropdown shows only N, N-1, N-2, and N+1 versions
 * where N is derived from the latest ClusterImageSet on the hub.
 * Migrated from: clc-ui-e2e/cypress/tests/clusters/managedClusters/clusterImage.spec.js
 */
import { test, expect } from '@fixtures/acm-test';
import { INFRA_PROVIDER_IDS, CONTROL_PLANE_IDS } from '@constants/cluster-create';

test.describe('Cluster Image', { tag: ['@cluster', '@clc', '@image'] }, () => {
  test(
    'RHACM4K-2576: Supported release images in create wizard',
    { tag: ['@RHACM4K-2576'] },
    async ({ page, oc, clusterListPage }) => {
      const supportedVersions = await test.step('Determine supported versions from hub', async () => {
        const latestVersion = await oc.getLatestClusterImageSetVersion();
        const [, minorStr] = latestVersion.split('.');
        const latestMinor = parseInt(minorStr, 10);
        return [latestMinor - 2, latestMinor - 1, latestMinor, latestMinor + 1].map(
          (m) => `4.${m}`
        );
      });

      const versionRegex = new RegExp(`^OpenShift (${supportedVersions.join('|')})\\.\\d+$`);

      await test.step('Navigate to AWS create wizard', async () => {
        await clusterListPage.goto();
        await clusterListPage.clickCreate();
        await page.locator(INFRA_PROVIDER_IDS.aws).click();
        await page.locator(CONTROL_PLANE_IDS.standalone).click();
        await page.waitForLoadState('domcontentloaded');
      });

      await test.step('Verify AWS release image versions', async () => {
        const releaseImageCombobox = page.getByRole('combobox', { name: /Release image/i });
        await expect(releaseImageCombobox).toBeVisible({ timeout: 30_000 });
        await releaseImageCombobox.click();

        const options = page.getByRole('option');
        await expect(options.first()).toBeVisible({ timeout: 10_000 });

        const texts = await options.allInnerTexts();
        const versionTexts = texts
          .map((t) => t.split('\n')[0].trim())
          .filter(Boolean);
        expect(versionTexts.length).toBeGreaterThan(0);
        for (const text of versionTexts) {
          expect(text).toMatch(versionRegex);
        }

        await page.keyboard.press('Escape');
      });
    }
  );
});
