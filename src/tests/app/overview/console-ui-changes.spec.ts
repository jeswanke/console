/**
 * RHACM4K-32401 — Console UI changes (channel copy links).
 *
 * Cypress: `Console_UI_Changes_Test_Suite.cy.js` (describe tagged `@UI`).
 */
import { runConsoleUiChannelCopyLinksScenario } from '@lib/app/verify/console-ui-changes';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Console UI Changes',
  { tag: ['@alc', '@e2e-common', '@console-ui'] },
  () => {
    test(
      'RHACM4K-32401: ALC: Clicking on git and helm application links copy instead of redirecting the user',
      { tag: ['@RHACM4K-32401', '@console-ui'] },
      async ({ oc, applicationListPage }) => {
        test.setTimeout(600_000);
        await runConsoleUiChannelCopyLinksScenario({ oc, applicationListPage });
      }
    );
  }
);
