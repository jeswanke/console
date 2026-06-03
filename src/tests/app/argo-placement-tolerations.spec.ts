/**
 * RHACM4K-61724: Argo CD ApplicationSet pull + push create wizards — Placement tolerations.
 */
import { expect } from '@playwright/test';
import { test } from '@fixtures/app-test';
import {
  APP_ARGO_PULL_CREATE_WIZARD,
  APP_ARGO_PUSH_CREATE_WIZARD,
} from '@constants/app';
import { PLACEMENT_DEFAULT_TOLERATIONS } from '@constants/placement-tolerations';
import {
  addCustomTolerationInForm,
  deleteUnavailableTolerationInForm,
  editUnreachableTolerationInForm,
  verifyAddArgoServerModalHasNoTolerationsForm,
  verifyAddArgoServerModalPlacementTolerationsInYaml,
  verifyCustomTolerationInYaml,
  verifyDefaultArgoPlacementTolerationsInYaml,
  verifyDefaultTolerationFieldsWhenExpanded,
  verifyDefaultTolerationSummaryChipsVisible,
  verifyUnavailableTolerationRemovedFromUi,
  verifyUnavailableTolerationRemovedFromYaml,
  verifyUnreachableTolerationUpdatedInArgoYaml,
  verifyUnreachableTolerationUpdatedInUi,
  type ArgoPlacementTolerationsWizardHost,
} from '@lib/app/argo/placement-tolerations-verify';

async function runArgoPlacementTolerationsFlow(
  wizard: ArgoPlacementTolerationsWizardHost,
  yamlPatterns: typeof APP_ARGO_PULL_CREATE_WIZARD.yamlPatterns
): Promise<void> {
  await test.step('Add Argo server modal — Placement tolerations in YAML only', async () => {
    await wizard.openAddArgoServerModal();
    await verifyAddArgoServerModalHasNoTolerationsForm(wizard);
    await verifyAddArgoServerModalPlacementTolerationsInYaml(wizard, yamlPatterns);
    await wizard.closeAddArgoServerModal();
  });

  await test.step('Open Placement step and scroll to Tolerations', async () => {
    await wizard.clickWizardStep('placement');
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
    await verifyDefaultArgoPlacementTolerationsInYaml(wizard, yamlPatterns);
  });

  await test.step('Edit unreachable toleration and verify UI and YAML sync', async () => {
    await editUnreachableTolerationInForm(wizard);
    await verifyUnreachableTolerationUpdatedInUi(wizard);
    await verifyUnreachableTolerationUpdatedInArgoYaml(wizard);
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

test.describe(
  'Argo ApplicationSet create wizard — Placement tolerations',
  { tag: ['@app', '@alc', '@UI', '@placement', '@gitops', '@argo-pull', '@argo-push'] },
  () => {
    test(
      'RHACM4K-61724: Default Placement CRs include unreachable and unavailable tolerations (pull and push)',
      { tag: ['@RHACM4K-61724'] },
      async ({
        applicationListPage,
        argoPullApplicationCreateWizardPage: pullWizard,
        argoPushApplicationCreateWizardPage: pushWizard,
      }) => {
        test.setTimeout(360_000);

        await test.step('Pull model — open create wizard', async () => {
          await pullWizard.openFromApplicationsList(applicationListPage);
          await expect(pullWizard.getPageTitle()).toBeVisible();
        });
        await runArgoPlacementTolerationsFlow(pullWizard, APP_ARGO_PULL_CREATE_WIZARD.yamlPatterns);

        await test.step('Push model — return to Applications and open create wizard', async () => {
          await applicationListPage.goto();
          await pushWizard.openFromApplicationsList(applicationListPage);
          await expect(pushWizard.getPageTitle()).toBeVisible();
        });
        await runArgoPlacementTolerationsFlow(pushWizard, APP_ARGO_PUSH_CREATE_WIZARD.yamlPatterns);
      }
    );
  }
);
