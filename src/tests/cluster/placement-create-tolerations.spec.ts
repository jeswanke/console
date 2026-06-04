/** RHACM4K-64216 — Create placement wizard: default tolerations and YAML sync. */
import { test } from '@fixtures/acm-test';
import { PLACEMENT_DEFAULT_TOLERATIONS } from '@constants/placement';
import {
  addCustomTolerationInForm,
  deleteUnavailableTolerationInForm,
  editUnreachableTolerationInForm,
  verifyCreatePlacementWizardTitle,
  verifyCustomTolerationInYaml,
  verifyDefaultPlacementTolerationsInYaml,
  verifyDefaultTolerationFieldsWhenExpanded,
  verifyDefaultTolerationSummaryChipsVisible,
  verifyUnavailableTolerationRemovedFromUi,
  verifyUnavailableTolerationRemovedFromYaml,
  verifyUnreachableTolerationUpdatedInUi,
  verifyUnreachableTolerationUpdatedInYaml,
} from '@lib/cluster/placement-create-verify';

test.describe(
  'Infrastructure Placements create wizard',
  { tag: ['@cluster', '@clc', '@UI', '@placement'] },
  () => {
    test(
      'RHACM4K-64216: As an admin, I expect standalone Placement CRs to automatically include unreachable and unavailable tolerations',
      { tag: ['@RHACM4K-64216'] },
      async ({ placementsListPage, createPlacementWizardPage: wizard }) => {
        test.setTimeout(120_000);

        await test.step('Navigate to Infrastructure → Clusters → Placements and open Create placement', async () => {
          await wizard.openFromPlacementsList(placementsListPage);
          await verifyCreatePlacementWizardTitle(wizard);
        });

        await test.step('Open Placement step and scroll to Tolerations', async () => {
          await wizard.clickWizardStep('placement');
          await wizard.scrollToTolerationsSection();
        });

        await test.step('Verify default unreachable and unavailable toleration blocks', async () => {
          await verifyDefaultTolerationSummaryChipsVisible(wizard);
          await verifyDefaultTolerationFieldsWhenExpanded(
            wizard,
            PLACEMENT_DEFAULT_TOLERATIONS.unreachableKey
          );
          await verifyDefaultTolerationFieldsWhenExpanded(
            wizard,
            PLACEMENT_DEFAULT_TOLERATIONS.unavailableKey
          );
        });

        await test.step('Enable YAML and verify default tolerations under spec', async () => {
          await wizard.enableYamlEditor();
          await verifyDefaultPlacementTolerationsInYaml(wizard);
        });

        await test.step('Edit unreachable toleration and verify UI and YAML sync', async () => {
          await editUnreachableTolerationInForm(wizard);
          await verifyUnreachableTolerationUpdatedInUi(wizard);
          await verifyUnreachableTolerationUpdatedInYaml(wizard);
        });

        await test.step('Delete unavailable toleration and verify UI and YAML', async () => {
          await deleteUnavailableTolerationInForm(wizard);
          await verifyUnavailableTolerationRemovedFromUi(wizard);
          await verifyUnavailableTolerationRemovedFromYaml(wizard);
        });

        await test.step('Add custom toleration and verify YAML', async () => {
          await addCustomTolerationInForm(wizard);
          await verifyCustomTolerationInYaml(wizard);
        });
      }
    );
  }
);
