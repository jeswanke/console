/**
 * Import wizard validation — verify form validation behavior.
 *
 * Tests field-level validation in the import cluster wizard without
 * actually importing a cluster. Validates required fields, error states,
 * and mode switching.
 *
 * RHACM4K-62281
 */
import { test, expect } from '@fixtures/acm-test';
import { IMPORT_WIZARD_FIELDS, IMPORT_MODES, IMPORT_BUTTONS } from '@constants/cluster-import';

test.describe(
  'Import Wizard Validation',
  { tag: ['@cluster', '@clc', '@import', '@RHACM4K-62281'] },
  () => {
    test.beforeEach(async ({ clusterListPage, importClusterWizardPage }) => {
      await clusterListPage.goto();
      await clusterListPage.clickImport();
      await importClusterWizardPage.waitForLoad();
    });

    test('RHACM4K-62281: Cluster name is required', async ({ page, importClusterWizardPage }) => {
      await test.step('Submit without cluster name shows validation error', async () => {
        await importClusterWizardPage.selectImportMode('kubeconfig');
        await importClusterWizardPage.pasteKubeconfig('apiVersion: v1\nkind: Config');
        await page.getByRole('button', { name: IMPORT_BUTTONS.import, exact: true }).click();
        await expect(
          page.getByText(/name/i).filter({ hasText: /required|enter|must/i })
        ).toBeVisible({
          timeout: 5_000,
        });
      });

      await test.step('Filling name clears validation error', async () => {
        await importClusterWizardPage.fillClusterName('validation-test');
        await expect(
          page.getByText(/name/i).filter({ hasText: /required|enter|must/i })
        ).not.toBeVisible({
          timeout: 5_000,
        });
      });
    });

    test('RHACM4K-62281: Import mode switching preserves cluster name', async ({
      page,
      importClusterWizardPage,
    }) => {
      const clusterName = 'mode-switch-test';

      await test.step('Fill cluster name', async () => {
        await importClusterWizardPage.fillClusterName(clusterName);
      });

      await test.step('Switch to kubeconfig mode', async () => {
        await importClusterWizardPage.selectImportMode('kubeconfig');
        const kubeConfigField = page.locator(IMPORT_WIZARD_FIELDS.kubeConfigEntry);
        await expect(kubeConfigField).toBeVisible({ timeout: 5_000 });
      });

      await test.step('Switch to token mode', async () => {
        await importClusterWizardPage.selectImportMode('token');
        const serverField = page.locator(IMPORT_WIZARD_FIELDS.server);
        await expect(serverField).toBeVisible({ timeout: 5_000 });
      });

      await test.step('Switch to manual mode', async () => {
        await importClusterWizardPage.selectImportMode('manual');
      });

      await test.step('Cluster name persisted across mode switches', async () => {
        const nameInput = page.locator(IMPORT_WIZARD_FIELDS.clusterName);
        await expect(nameInput).toHaveValue(clusterName);
      });
    });

    test('RHACM4K-62281: Cancel returns to cluster list', async ({
      page,
      importClusterWizardPage,
    }) => {
      await importClusterWizardPage.fillClusterName('cancel-test');
      await page.getByRole('button', { name: IMPORT_BUTTONS.cancel, exact: true }).click();
      await expect(page).toHaveURL(/\/clusters$/, { timeout: 10_000 });
    });
  }
);
