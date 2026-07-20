/**
 * RHACM4K-64890 — Welcome page: Search card replaces Multicluster networking,
 * Technical community link points to open-cluster-management.io.
 */
import { WELCOME_PAGE } from '@constants/welcome';
import { expect, test } from '@fixtures/acm-test';

test.describe(
  'Welcome page',
  { tag: ['@cluster', '@UI', '@welcome'] },
  () => {
    test(
      'RHACM4K-64890: Search card and community link on Welcome page',
      { tag: ['@RHACM4K-64890'] },
      async ({ welcomePage, page }) => {
        await welcomePage.goto();
        await expect(welcomePage.getPageTitle()).toBeVisible();

        await test.step('Verify 5 capability cards are rendered', async () => {
          const cards = welcomePage.getCapabilityCards();
          await expect(cards).toHaveCount(WELCOME_PAGE.capabilityCards.count);
        });

        await test.step('Verify Search card is the 5th card with correct content', async () => {
          const fifthCard = welcomePage.getCapabilityCards().nth(4);
          await expect(fifthCard).toContainText(WELCOME_PAGE.capabilityCards.search.title);
          await expect(fifthCard).toContainText(WELCOME_PAGE.capabilityCards.search.description);
          await expect(fifthCard).toHaveAttribute(
            'href',
            WELCOME_PAGE.capabilityCards.search.route
          );
        });

        await test.step('Verify Multicluster networking card is absent', async () => {
          await expect(welcomePage.getCapabilityCardByTitle('Multicluster networking')).toHaveCount(0);
        });

        await test.step('Click Search card navigates to /multicloud/search', async () => {
          await welcomePage.getSearchCard().click();
          await expect(page).toHaveURL(new RegExp(`${WELCOME_PAGE.searchRoute}$`));
        });

        await test.step('Navigate back and verify Converse and connect section', async () => {
          await welcomePage.goto();
          await welcomePage.getConverseAndConnectHeading().scrollIntoViewIfNeeded();
          await expect(welcomePage.getConverseAndConnectHeading()).toBeVisible();
          await expect(welcomePage.getTechnicalCommunityLink()).toBeVisible();
          await expect(welcomePage.getSupportCenterLink()).toBeVisible();
        });

        await test.step('Technical community link points to open-cluster-management.io', async () => {
          const techLink = welcomePage.getTechnicalCommunityLink();
          await expect(techLink).toHaveAttribute(
            'href',
            WELCOME_PAGE.converseAndConnect.technicalCommunity.href
          );
          await expect(techLink).toHaveAttribute('target', '_blank');
        });
      }
    );
  }
);
