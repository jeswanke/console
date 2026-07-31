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
      await test.step('Click Next without cluster name stays on same page', async () => {
        const urlBefore = page.url();
        await page.getByRole('button', { name: IMPORT_BUTTONS.next, exact: true }).click();
        // Wizard should not advance without a name — URL stays the same
        await expect(page).toHaveURL(urlBefore);
        // Name input should still be visible (didn't advance)
        const nameInput = page.locator(IMPORT_WIZARD_FIELDS.clusterName);
        await expect(nameInput).toBeVisible();
      });

      await test.step('Filling name allows advancing', async () => {
        await importClusterWizardPage.fillClusterName('validation-test');
        await page.getByRole('button', { name: IMPORT_BUTTONS.next, exact: true }).click();
        // Should advance to step 2
        const nameInput = page.locator(IMPORT_WIZARD_FIELDS.clusterName);
        await expect(nameInput).not.toBeVisible({ timeout: 5_000 });
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
