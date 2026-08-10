/** RHACM4K-64170 — Advanced configuration: PlacementRules tab and terminology removed. */
import { test } from '@fixtures/app-test';
import {
  ensureAdvancedTerminologyCardExpanded,
  verifyAdvancedConfigResourceTabsExcludePlacementRules,
  verifyAdvancedConfigTabSelected,
  verifyAdvancedConfigTerminologyExcludesPlacementRules,
} from '@lib/app/verify/advanced-config';

test.describe(
  'Applications Advanced configuration — RHACM4K-64170',
  { tag: ['@app', '@alc'] },
  () => {
    test(
      'RHACM4K-64170: ALC: As an application admin, I can verify removal of the PlacementRule tab, and removal of PlacementRule terminology',
      { tag: ['@RHACM4K-64170'] },
      async ({ applicationListPage }) => {
        await test.step('Navigate to Applications Advanced configuration', async () => {
          await applicationListPage.goto();
          await applicationListPage.openAdvancedConfigTab();
          await verifyAdvancedConfigTabSelected(applicationListPage);
        });

        await test.step('Verify PlacementRules is not listed in terminology', async () => {
          await ensureAdvancedTerminologyCardExpanded(applicationListPage);
          await verifyAdvancedConfigTerminologyExcludesPlacementRules(applicationListPage);
        });

        await test.step('Verify PlacementRules does not appear as a sub-tab', async () => {
          await verifyAdvancedConfigResourceTabsExcludePlacementRules(applicationListPage);
        });
      }
    );
  }
);
