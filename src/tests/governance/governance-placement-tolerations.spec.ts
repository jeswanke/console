/**
 * Governance create wizards — Placement step default tolerations and YAML sync.
 *
 * RHACM4K-64217 (Policy set), RHACM4K-64218 (Policy). Shared: {@link PlacementTolerationsActions}.
 */
import { test } from '@fixtures/acm-test';
import { POLICY_CREATE_WIZARD, POLICY_SET_CREATE_WIZARD } from '@constants/governance';
import { PLACEMENT_DEFAULT_TOLERATIONS } from '@constants/placement-tolerations';
import {
  addCustomTolerationInForm,
  deleteUnavailableTolerationInForm,
  editUnreachableTolerationInForm,
  verifyCreatePolicyWizardTitle,
  verifyCustomTolerationInYaml,
  verifyDefaultPolicyPlacementTolerationsInYaml,
  verifyDefaultTolerationFieldsWhenExpanded,
  verifyDefaultTolerationSummaryChipsVisible,
  verifyNewPlacementSelected,
  verifyUnavailableTolerationRemovedFromUi,
  verifyUnavailableTolerationRemovedFromYaml,
  verifyUnreachableTolerationUpdatedInPolicyYaml,
  verifyUnreachableTolerationUpdatedInUi,
} from '@lib/governance/policy-create-verify';
import {
  verifyCreatePolicySetWizardTitle,
  verifyDefaultPolicySetPlacementTolerationsInYaml,
  verifyUnreachableTolerationUpdatedInPolicySetYaml,
} from '@lib/governance/policy-set-create-verify';

test.describe(
  'Governance create wizards — Placement tolerations',
  { tag: ['@governance', '@grc', '@UI', '@placement'] },
  () => {
    test(
      'RHACM4K-64217: As an admin, I expect Policy set Placement step to include default unreachable and unavailable tolerations',
      { tag: ['@RHACM4K-64217'] },
      async ({ policySetsListPage, createPolicySetWizardPage: wizard }) => {
        test.setTimeout(120_000);

        const policySetName = `${POLICY_SET_CREATE_WIZARD.testData.namePrefix}-${Date.now()}`;

        await test.step('Navigate to Governance → Policy sets and open Create policy set', async () => {
          await wizard.openFromPolicySetsList(policySetsListPage);
          await verifyCreatePolicySetWizardTitle(wizard);
        });

        await test.step('Complete Details and Policies steps to reach Placement', async () => {
          await wizard.fillDetailsAndAdvanceToPlacementStep(policySetName);
          await wizard.tolerations.scrollToTolerationsSection();
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

        await test.step('Enable YAML and verify default tolerations in Placement document', async () => {
          await wizard.syncEditor.enableYamlEditor();
          await verifyDefaultPolicySetPlacementTolerationsInYaml(wizard);
        });

        await test.step('Edit unreachable toleration and verify UI and YAML sync', async () => {
          await editUnreachableTolerationInForm(wizard);
          await verifyUnreachableTolerationUpdatedInUi(wizard);
          await verifyUnreachableTolerationUpdatedInPolicySetYaml(wizard);
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

    test(
      'RHACM4K-64218: As a governance admin, I expect default Placement CRs for Policies to automatically include unreachable and unavailable tolerations',
      { tag: ['@RHACM4K-64218'] },
      async ({ policiesListPage, createPolicyWizardPage: wizard }) => {
        test.setTimeout(120_000);

        const policyName = `${POLICY_CREATE_WIZARD.testData.namePrefix}-${Date.now()}`;

        await test.step('Navigate to Governance → Policies and open Create policy', async () => {
          await wizard.openFromPoliciesList(policiesListPage);
          await verifyCreatePolicyWizardTitle(wizard);
        });

        await test.step('Complete Details and Policy templates steps; reach Placement with New placement', async () => {
          await wizard.fillDetailsAndAdvanceToPlacementStep(policyName);
          await verifyNewPlacementSelected(wizard);
          await wizard.tolerations.scrollToTolerationsSection();
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

        await test.step('Enable YAML and verify default tolerations in Placement document', async () => {
          await wizard.syncEditor.enableYamlEditor();
          await verifyDefaultPolicyPlacementTolerationsInYaml(wizard);
        });

        await test.step('Edit unreachable toleration and verify UI and YAML sync', async () => {
          await editUnreachableTolerationInForm(wizard);
          await verifyUnreachableTolerationUpdatedInUi(wizard);
          await verifyUnreachableTolerationUpdatedInPolicyYaml(wizard);
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
