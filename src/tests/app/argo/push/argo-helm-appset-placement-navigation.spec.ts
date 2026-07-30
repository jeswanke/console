/**
 * RHACM4K-64417: ApplicationSet details → Placement hyperlink navigation and Overview verification.
 *
 * Setup: {@link applyArgoHelmAppsetSetup} (`src/templates/app/argo-helm-appset-setup.yaml`).
 * UI locators: {@link ApplicationDetailsPage}, {@link PlacementDetailsPage}.
 */
import { expect } from '@playwright/test';
import {
  argoHelmAppsetScenario,
  navigateToPlacementFromApplicationSetDetails,
  openApplicationSetFromList,
  verifyApplicationSetDetailsPlacementLink,
  verifyPlacementOverviewFromApplicationSet,
} from '@lib/app/argo-helm-appset/placement-navigation-verify';
import {
  applyArgoHelmAppsetSetup,
  cleanupArgoHelmAppsetSetup,
  waitForArgoHelmPlacementReady,
} from '@lib/app/setup/argo-helm-appset-setup';
import { test } from '@fixtures/app-test';

test.describe(
  'Argo Helm ApplicationSet — Placement navigation',
  { tag: ['@app', '@alc', '@placement', '@gitops', '@argo-push'] },
  () => {
    test(
      'RHACM4K-64417: ALC: As an application admin, I can view and navigate to the associated Placement from the ApplicationSet details page',
      { tag: ['@RHACM4K-64417'] },
      async ({
        oc,
        applicationListPage,
        applicationDetailsPage,
        placementDetailsPage,
      }) => {
        test.setTimeout(300_000);
        const scenario = argoHelmAppsetScenario();

        await test.step('Apply ApplicationSet and Placement test resources', async () => {
          await cleanupArgoHelmAppsetSetup(oc);
          await applyArgoHelmAppsetSetup(oc);
          await expect
            .poll(() => oc.applicationSetExists(scenario.namespace, scenario.applicationSetName), {
              timeout: 120_000,
            })
            .toBe(true);
          await waitForArgoHelmPlacementReady(oc);
        });

        await test.step('Open ApplicationSet from Applications list (Topology tab)', async () => {
          await openApplicationSetFromList(applicationListPage, scenario.applicationSetName);
          await applicationDetailsPage.expectDetailTabSelected('topology');
        });

        await test.step('Switch to Details and verify Placement hyperlink', async () => {
          await verifyApplicationSetDetailsPlacementLink(applicationDetailsPage, scenario);
        });

        await test.step('Follow Placement link to Overview tab', async () => {
          await navigateToPlacementFromApplicationSetDetails(applicationDetailsPage, scenario);
          await expect(placementDetailsPage.getPlacementHeading()).toHaveText(scenario.placementName);
          await placementDetailsPage.expectOverviewTabSelected();
        });

        await test.step('Verify Placement Overview details, Used in, PlacementDecisions, and Conditions', async () => {
          await verifyPlacementOverviewFromApplicationSet(placementDetailsPage, scenario);
        });
      }
    );
  }
);
