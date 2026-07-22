/**
 * RHACM4K-31501 / RHACM4K-32401 — Console UI changes (placement rule deprecation, channel copy links).
 *
 * Cypress: `Console_UI_Changes_Test_Suite.cy.js` (describe tagged `@UI`).
 */
import {
  runConsoleUiChannelCopyLinksScenario,
  runConsoleUiPlacementDeprecationScenario,
} from '@lib/app/verify/console-ui-changes';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Supporting Placement Rule Deprecation',
  { tag: ['@ALC', '@e2e-common', '@placementrule', '@console-ui', '@UI'] },
  () => {
    test(
      'RHACM4K-31501: ALC: Create detail information in the YAML editor to support placement rule deprecation',
      { tag: ['@RHACM4K-31501', '@UI', '@console-ui'] },
      async ({ applicationListPage, subscriptionApplicationCreateWizardPage: wizard }) => {
        test.setTimeout(300_000);
        await runConsoleUiPlacementDeprecationScenario({ applicationListPage, wizard });
      }
    );

    test(
      'RHACM4K-32401: ALC: Clicking on git and helm application links copy instead of redirecting the user',
      { tag: ['@RHACM4K-32401', '@UI', '@console-ui'] },
      async ({ oc, applicationListPage }) => {
        test.setTimeout(600_000);
        await runConsoleUiChannelCopyLinksScenario({ oc, applicationListPage });
      }
    );
  }
);
