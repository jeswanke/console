/**
 * Import wizard validation — verify form validation behavior.
 *
 * Tests field-level validation in the import cluster wizard without
 * actually importing a cluster. Validates required fields and cancel.
 *
 * RHACM4K-62281
 */
import { test, expect } from '@fixtures/acm-test';
import { IMPORT_WIZARD_FIELDS, IMPORT_BUTTONS } from '@constants/cluster-import';

test.describe(
  'Import Wizard Validation',
  { tag: ['@cluster', '@clc', '@import', '@RHACM4K-62281'] },
  () => {
    test.beforeEach(async ({ importClusterWizardPage }) => {
      await importClusterWizardPage.goto();
    });

    test('RHACM4K-62281: Cluster name is required', async ({ page, importClusterWizardPage }) => {
      await test.step('Click Next without cluster name shows validation', async () => {
        await page.getByRole('button', { name: IMPORT_BUTTONS.next, exact: true }).click();
        await expect(page.getByText(/required/i)).toBeVisible({ timeout: 5_000 });
      });

      await test.step('Filling name allows advancing', async () => {
        await importClusterWizardPage.fillClusterName('validation-test');
        await expect(page.getByText(/required/i)).not.toBeVisible({ timeout: 5_000 });
      });
    });

    test('RHACM4K-62281: Import mode selection changes form fields', async ({
      page,
      importClusterWizardPage,
    }) => {
      await test.step('Fill cluster name', async () => {
        await importClusterWizardPage.fillClusterName('mode-switch-test');
      });

      await test.step('Switch to kubeconfig mode shows kubeconfig field', async () => {
        await importClusterWizardPage.selectImportMode('kubeconfig');
        const kubeConfigField = page.locator(IMPORT_WIZARD_FIELDS.kubeConfigEntry);
        await expect(kubeConfigField).toBeVisible({ timeout: 5_000 });
      });

      await test.step('Switch back to manual mode hides kubeconfig field', async () => {
        await importClusterWizardPage.selectImportMode('manual');
        await expect(page.locator(IMPORT_WIZARD_FIELDS.kubeConfigEntry)).not.toBeVisible();
      });
    });

    test('RHACM4K-62281: Cancel returns to cluster list', async ({
      page,
      importClusterWizardPage,
    }) => {
      await importClusterWizardPage.fillClusterName('cancel-test');
      await page.getByRole('button', { name: IMPORT_BUTTONS.cancel, exact: true }).click();
      await expect(page).toHaveURL(/\/clusters/, { timeout: 10_000 });
    });
  }
);
