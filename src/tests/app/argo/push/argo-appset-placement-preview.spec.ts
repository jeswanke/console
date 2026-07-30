/**
 * RHACM4K-64219 — Argo ApplicationSet pull wizard placement preview.
 *
 * Scenario `argo_appset_placement_preview_64219` in `src/config/e2e-spec-data/applications/argo-push.yaml`.
 * Prereq: GitOps prep and `auto-gitops-cluster-set` labels on managed clusters.
 * Push existing-placement: use `runArgoPushExistingPlacementPreviewFlow` when the wizard exposes preview.
 */
import { resolveArgoPushScenarioByTestId } from '@config';
import { expect } from '@playwright/test';
import { test } from '@fixtures/app-test';
import { runArgoPullPlacementPreviewFlow } from '@lib/app/argo/argo-appset-placement-preview-verify';
import { applyGitopsPlacementPreviewSetup } from '@lib/app/argo/gitops-placement-preview-setup';

test.describe(
  'Argo ApplicationSet create wizard — Placement cluster preview',
  { tag: ['@app', '@alc', '@placement', '@placement-preview', '@gitops', '@argo-pull'] },
  () => {
    const { argoPush: options } = resolveArgoPushScenarioByTestId('RHACM4K-64219');

    test.beforeAll(async ({ oc }) => {
      await applyGitopsPlacementPreviewSetup(oc, options);
    });

    test(
      'RHACM4K-64219: ALC: As an application admin, I can preview matched clusters via Placement Preview in ApplicationSet wizards',
      { tag: ['@RHACM4K-64219'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage: pullWizard }) => {
        test.setTimeout(360_000);

        await test.step('Pull model — open wizard and run new-placement preview scenarios', async () => {
          await pullWizard.openFromApplicationsList(applicationListPage);
          await expect(pullWizard.getPageTitle()).toBeVisible();
          await runArgoPullPlacementPreviewFlow(pullWizard, options);
        });
      }
    );
  }
);
