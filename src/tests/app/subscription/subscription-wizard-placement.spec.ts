/** RHACM4K-64215 — Subscription create wizard: Placement dropdown only (no PlacementRule banner). */
import { test } from '@fixtures/app-test';
import { PLACEMENT_TEST_RESOURCES } from '@constants/app';
import {
  applyPlacementTestResources,
  cleanupPlacementTestResources,
} from '@lib/app/setup/placement-test-resources';
import {
  enableExistingPlacementConfigurationInRepositoryBlock,
  verifyExistingPlacementDropdownOptionsInRepositoryBlock,
  verifyPlacementRuleDeprecationAlertNotVisibleInRepositoryBlock,
  verifySubscriptionWizardNamespaceSelected,
} from '@lib/app/subscription/placement-wizard-verify';

test.describe('Subscription wizard placement', { tag: ['@app', '@alc', '@placement'] }, () => {
  test.afterEach(async ({ oc }) => {
    await cleanupPlacementTestResources(oc);
  });

  test(
    'RHACM4K-64215: ALC: As an application admin, I can verify the removal of the PlacementRule deprecation banner and that only Placement resources are selectable during Subscription creation',
    { tag: ['@RHACM4K-64215'] },
    async ({ oc, applicationListPage, subscriptionApplicationCreateWizardPage: wizard }) => {
      await test.step('Apply placement test resources on the hub', async () => {
        await applyPlacementTestResources(oc);
      });

      await test.step('Open subscription create wizard and select test namespace', async () => {
        await wizard.openFromApplicationsList(applicationListPage);
        await wizard.collapseYamlEditor();
        await wizard.fillApplicationName(PLACEMENT_TEST_RESOURCES.applicationName);
        await wizard.selectNamespace(PLACEMENT_TEST_RESOURCES.namespace);
        await verifySubscriptionWizardNamespaceSelected(wizard, PLACEMENT_TEST_RESOURCES.namespace);
      });

      await test.step('Select Git repository type', async () => {
        await wizard.expandRepositoryTypesSectionForRepositoryBlock(0);
        await wizard.selectRepositoryTypeInBlock(0, 'git');
      });

      await test.step('Verify PlacementRule deprecation banner is not shown in placement section', async () => {
        await wizard.expandClusterDeploymentSectionForRepositoryBlock(0);
        await verifyPlacementRuleDeprecationAlertNotVisibleInRepositoryBlock(wizard, 0);
      });

      await test.step('Select existing placement and verify only Placement resources are listed', async () => {
        await enableExistingPlacementConfigurationInRepositoryBlock(wizard, 0);
        await verifyExistingPlacementDropdownOptionsInRepositoryBlock(wizard, 0, {
          visible: [PLACEMENT_TEST_RESOURCES.placementName],
          notVisible: [PLACEMENT_TEST_RESOURCES.legacyPlacementRuleName],
        });
      });
    }
  );
});
