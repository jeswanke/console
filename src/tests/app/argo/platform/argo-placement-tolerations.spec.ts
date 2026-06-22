/**
 * RHACM4K-61724: Argo CD ApplicationSet pull + push create wizards — Placement tolerations.
 */
import { expect } from '@playwright/test';
import { test } from '@fixtures/app-test';
import {
  ARGO_PLACEMENT_TOLERATIONS_WIZARD_YAML,
  runArgoPlacementTolerationsFlow,
} from '@lib/app/argo/placement-tolerations-verify';

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

        await pullWizard.openFromApplicationsList(applicationListPage);
        await expect(pullWizard.getPageTitle()).toBeVisible();
        await runArgoPlacementTolerationsFlow(
          pullWizard,
          ARGO_PLACEMENT_TOLERATIONS_WIZARD_YAML.pull
        );

        await applicationListPage.goto();
        await pushWizard.openFromApplicationsList(applicationListPage);
        await expect(pushWizard.getPageTitle()).toBeVisible();
        await runArgoPlacementTolerationsFlow(
          pushWizard,
          ARGO_PLACEMENT_TOLERATIONS_WIZARD_YAML.push
        );
      }
    );
  }
);
