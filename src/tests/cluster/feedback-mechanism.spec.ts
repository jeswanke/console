/**
 * Feedback mechanism — verify the feedback modal opens, shows correct content,
 * and is accessible from multiple ACM pages.
 *
 * Migrated from: clc-ui-e2e/cypress/tests/console/feedbackMechanism/feedbackMechanism.spec.js
 */
import { test, expect } from '@fixtures/acm-test';

const FEEDBACK_BUTTON = '#feedback-trigger-button';
const FEEDBACK_MODAL_TITLE = 'Tell us about your experience';

test.describe('Feedback Mechanism', { tag: ['@cluster', '@clc', '@feedback'] }, () => {
  test(
    'RHACM4K-52508: Feedback modal content and close behavior',
    { tag: ['@RHACM4K-52508'] },
    async ({ page, clusterListPage }) => {
      await test.step('Navigate to cluster list', async () => {
        await clusterListPage.goto();
      });

      await test.step('Open feedback modal and verify content', async () => {
        await page.locator(FEEDBACK_BUTTON).click();
        const modal = page.getByRole('dialog', { name: /Feedback/i });
        await expect(modal).toBeVisible();
        await expect(modal.getByText(FEEDBACK_MODAL_TITLE)).toBeVisible();
        await expect(modal.getByText('Share feedback')).toBeVisible();
        await expect(modal.getByText('Support Case')).toBeVisible();
      });

      await test.step('Close modal via Cancel button', async () => {
        const modal = page.getByRole('dialog', { name: /Feedback/i });
        await modal.getByRole('button', { name: 'Cancel' }).click();
        await expect(modal).toBeHidden();
      });

      await test.step('Reopen and close via X button', async () => {
        await page.locator(FEEDBACK_BUTTON).click();
        const modal = page.getByRole('dialog', { name: /Feedback/i });
        await expect(modal).toBeVisible();
        await modal.getByRole('button', { name: 'Close' }).click();
        await expect(modal).toBeHidden();
      });
    }
  );

  test(
    'RHACM4K-52514: Feedback button present on multiple pages',
    { tag: ['@RHACM4K-52514'] },
    async ({ page, oc }) => {
      const consoleUrl = await oc.getConsoleUrl();

      const pages = [
        { name: 'Clusters', path: '/multicloud/infrastructure/clusters/managed' },
        { name: 'Overview', path: '/multicloud/home/overview' },
        { name: 'Governance', path: '/multicloud/governance' },
        { name: 'Credentials', path: '/multicloud/credentials' },
      ];

      for (const acmPage of pages) {
        await test.step(`Verify feedback on ${acmPage.name} page`, async () => {
          await page.goto(`${consoleUrl}${acmPage.path}`);
          const feedbackBtn = page.locator(FEEDBACK_BUTTON);
          await expect(feedbackBtn).toBeVisible({ timeout: 30_000 });
          await feedbackBtn.click();
          const modal = page.getByRole('dialog', { name: /Feedback/i });
          await expect(modal).toBeVisible();
          await modal.getByRole('button', { name: 'Cancel' }).click();
          await expect(modal).toBeHidden();
        });
      }
    }
  );
});
