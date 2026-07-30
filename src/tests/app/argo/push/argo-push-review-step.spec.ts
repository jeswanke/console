/** RHACM4K-63807 — Argo ApplicationSet push-model wizard Review step (collapse, search, YAML highlight). */
import { resolveArgoPushScenarioById } from '@config';
import { fillArgoPushWizardToReview } from '@lib/app/argo-push/create';
import {
  verifyReviewCollapseAllAndExpandAll,
  verifyReviewEditNavigatesToWizardStep,
  verifyReviewSearchFiltersDetails,
  verifyReviewSectionToggleCollapsesDetails,
  verifyReviewYamlHighlightClearsOnYamlEdit,
  verifyReviewYamlHighlightForField,
  verifyReviewYamlHighlightSkippedWhenBlockFolded,
  verifyYamlPanelHiddenOnReview,
  verifyYamlPanelVisibleOnReview,
} from '@lib/app/argo-push/review-verify';
import { test } from '@fixtures/app-test';

test.describe(
  'Argo push ApplicationSet review step',
  { tag: ['@app', '@alc', '@argo', '@push-model', '@review'] },
  () => {
    test(
      'RHACM4K-63807: ALC: As an application admin, I can utilize the enhanced review step features during Application Set creation',
      { tag: ['@RHACM4K-63807', '@gitops'] },
      async ({ applicationListPage, argoPushApplicationCreateWizardPage: wizard }) => {
        test.setTimeout(300_000);

        const { argoPush: options } = resolveArgoPushScenarioById('auto_git_push_review_63807');
        const { applicationName } = options;

        await test.step('Open wizard and reach Review with test data', async () => {
          await fillArgoPushWizardToReview(applicationListPage, wizard, options);
        });

        await test.step('Verify YAML panel is hidden when YAML switch is off', async () => {
          await verifyYamlPanelHiddenOnReview(wizard);
        });

        await test.step('Toggle individual review sections (mixed collapse/expand)', async () => {
          await verifyReviewSectionToggleCollapsesDetails(wizard, 'General', /^Name$/);
          await verifyReviewSectionToggleCollapsesDetails(
            wizard,
            'Generators',
            /Cluster Decision Resource|180/
          );
          await wizard.expectReviewSectionExpanded('Template', true);
          await wizard.expectReviewSectionExpanded('Placement', true);
        });

        await test.step('Verify Collapse all and Expand all', async () => {
          await verifyReviewCollapseAllAndExpandAll(wizard);
        });

        await test.step('Search review details filters the summary list', async () => {
          await verifyReviewSearchFiltersDetails(wizard, 'Argo server', {
            expectVisible: /openshift-gitops/i,
            expectHidden: /^Name$/,
          });
        });

        await test.step('Verify YAML syntax highlighting from review field arrow control', async () => {
          await verifyYamlPanelVisibleOnReview(wizard);
          await verifyReviewYamlHighlightForField(wizard, /^Name$/);
        });

        await test.step('Verify YAML highlight clears when the field value is edited in YAML', async () => {
          await verifyReviewYamlHighlightClearsOnYamlEdit(wizard, /^Name$/, '-e2e-edit');
        });

        await test.step('Verify YAML highlight is skipped when the target block is folded', async () => {
          await verifyReviewYamlHighlightSkippedWhenBlockFolded(wizard, /^Name$/);
        });

        await test.step('Verify Edit returns to the wizard step with data retained', async () => {
          await verifyReviewEditNavigatesToWizardStep(wizard, {
            fieldLabel: /^Name$/,
            stepId: 'general',
            retainedValue: applicationName,
            formControl: () => wizard.getApplicationNameInput(),
          });
        });
      }
    );
  }
);
