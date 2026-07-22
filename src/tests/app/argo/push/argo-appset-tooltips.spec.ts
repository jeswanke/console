/**
 * RHACM4K-61725 — Argo ApplicationSet pull-model wizard tooltips.
 *
 * Cypress: `Argo_Appset_Tooltips_Test_Suite.cy.js`.
 */
import { ARGO_WIZARD_TOOLTIPS, ARGO_WIZARD_MORE_INFO_BUTTON } from '@constants/argo-wizard-tooltips';
import type { ArgoGeneratorDisplayName } from '@constants/argo-appset-generators';
import {
  openArgoPullWizardGeneralStep,
  selectPullWizardRepositoryGit,
  selectPullWizardRepositoryHelm,
  switchPullWizardSecondGenerator,
  verifyArgoWizardTooltip,
  assertGeneratorBlockHasNoMoreInfo,
} from '@lib/app/argo/wizard-tooltips-verify';
import { addArgoGenerator } from '@lib/app/argo/generator-wizard-actions';
import { test } from '@fixtures/app-test';
import { expect } from '@playwright/test';

test.describe(
  'Application Lifecycle UI: Argo ApplicationSet wizard tooltips',
  { tag: ['@ALC', '@gitops', '@e2e-argo', '@applicationset', '@argo-wizard-tooltips'] },
  () => {
    test(
      'RHACM4K-61725: ALC: Verify tooltips in the Argo ApplicationSet creation wizard',
      { tag: ['@RHACM4K-61725', '@UI', '@e2e-argo'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage: pullWizard }) => {
        test.setTimeout(600_000);
        const page = pullWizard.getPage();
        await openArgoPullWizardGeneralStep(applicationListPage, pullWizard);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.general.argoServer);

        await pullWizard.clickWizardStep('generators');
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.clusterDecisionRequeue);

        await addArgoGenerator(page, 'Clusters generator');
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.clustersMatchLabels);

        await switchPullWizardSecondGenerator(page, 'Git generator');
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.gitRepoUrl);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.gitRevision);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.gitRequeue);

        await switchPullWizardSecondGenerator(page, 'List generator');
        await assertGeneratorBlockHasNoMoreInfo(page, /List/i);

        await switchPullWizardSecondGenerator(page, 'Plugin generator');
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.pluginInputParams);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.pluginValues);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.pluginRequeue);

        await switchPullWizardSecondGenerator(page, 'Pull Request generator');
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.generators.pullRequestRequeue);

        await switchPullWizardSecondGenerator(page, 'SCM Provider generator');
        await assertGeneratorBlockHasNoMoreInfo(page, /Scm Provider/i);

        await pullWizard.clickWizardStep('repository');
        await selectPullWizardRepositoryGit(page);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.repository.gitRepoUrl);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.repository.targetRevision);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.repository.path);

        await selectPullWizardRepositoryHelm(page);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.repository.helmRepoUrl);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.repository.chart);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.repository.helmTargetRevision);

        await pullWizard.clickWizardStep('sync-policy');
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.syncPolicy.prune);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.syncPolicy.allowEmpty);
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.syncPolicy.selfHeal);

        await pullWizard.clickWizardStep('placement');
        await verifyArgoWizardTooltip(page, ARGO_WIZARD_TOOLTIPS.placement.clusterSets);

        await page.getByRole('button', { name: 'Existing placement' }).click({ force: true });
        await expect(page.locator('#placement').locator(ARGO_WIZARD_MORE_INFO_BUTTON)).toHaveCount(0);

        await pullWizard.clickWizardStep('review-step');
        await expect(page.locator('#review-step').locator(ARGO_WIZARD_MORE_INFO_BUTTON)).toHaveCount(0);
      }
    );
  }
);
