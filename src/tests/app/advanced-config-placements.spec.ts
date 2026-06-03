/**
 * RHACM4K-63573: Applications → Advanced configuration — page deprecation notice,
 * Placements removed from terminology and resource sub-tabs, Learn more documentation link.
 *
 * Architecture: spec is declarative; locators on {@link ApplicationListPage};
 * assertions in {@link advanced-config}.
 */
import { test } from '@fixtures/app-test';
import {
  ensureAdvancedTerminologyCardExpanded,
  verifyAdvancedConfigResourceTabsExcludePlacements,
  verifyAdvancedConfigTabSelected,
  verifyAdvancedConfigTerminologyExcludesPlacements,
  verifyAdvancedDeprecationBanner,
  verifyAdvancedDeprecationLearnMoreOpensDocumentation,
} from '@lib/app/verify/advanced-config';

test.describe(
  'Applications Advanced configuration',
  { tag: ['@app', '@alc', '@UI'] },
  () => {
    test(
      'RHACM4K-63573: As an application admin, I can verify the page deprecation notice, removal of the Placements tab, and removal of placement terminology',
      { tag: ['@RHACM4K-63573'] },
      async ({ applicationListPage }) => {
        await test.step('Navigate to Applications Advanced configuration', async () => {
          await applicationListPage.goto();
          await applicationListPage.openAdvancedConfigTab();
          await verifyAdvancedConfigTabSelected(applicationListPage);
        });

        await test.step('Verify page deprecation notice at top of tab', async () => {
          await verifyAdvancedDeprecationBanner(applicationListPage);
        });

        await test.step('Click Learn more and verify documentation opens in a new tab', async () => {
          await verifyAdvancedDeprecationLearnMoreOpensDocumentation(applicationListPage);
        });

        await test.step('Verify Placements is not listed in terminology', async () => {
          await ensureAdvancedTerminologyCardExpanded(applicationListPage);
          await verifyAdvancedConfigTerminologyExcludesPlacements(applicationListPage);
        });

        await test.step('Verify Placements does not appear as a sub-tab', async () => {
          await verifyAdvancedConfigResourceTabsExcludePlacements(applicationListPage);
        });
      }
    );
  }
);
