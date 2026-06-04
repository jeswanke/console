/**
 * RHACM4K-64220: Standalone Create placement wizard — Placement cluster preview.
 *
 * Scenario data: `src/config/e2e-spec-data/cluster/placement-preview.yaml`.
 */
import { test } from '@fixtures/acm-test';
import { resolvePlacementScenarioByTestId } from '@config';
import { managedClusterNamesForPreview } from '@lib/cluster/managedClusterContext';
import {
  applyPlacementCreatePreviewSetup,
  labelClustersForPlacementCreatePreview,
} from '@lib/cluster/placement-preview-setup';
import {
  runPlacementCreatePreviewFlow,
  verifyCreatePlacementWizardVisible,
} from '@lib/cluster/placement-create-preview-verify';

const placementPreviewScenario = resolvePlacementScenarioByTestId('RHACM4K-64220');

test.describe(
  'Infrastructure Placements create wizard — cluster preview',
  { tag: ['@cluster', '@clc', '@UI', '@placement', '@placement-preview'] },
  () => {
    test.beforeAll(async ({ oc }) => {
      await applyPlacementCreatePreviewSetup(oc, placementPreviewScenario.placement);
      await labelClustersForPlacementCreatePreview(
        oc,
        managedClusterNamesForPreview(),
        placementPreviewScenario.placement.clusterSet
      );
    });

    test(
      'RHACM4K-64220: As an admin, I can preview matched clusters via Placement Preview in the standalone Placement wizard',
      { tag: ['@RHACM4K-64220'] },
      async ({ placementsListPage, createPlacementWizardPage: wizard }) => {
        test.setTimeout(300_000);

        const { namespace, clusterSet, namePrefix } = placementPreviewScenario.placement;
        const placementName = `${namePrefix}-${Date.now()}`;

        await test.step('Open Create placement and run placement preview scenarios', async () => {
          await wizard.openFromPlacementsList(placementsListPage);
          await verifyCreatePlacementWizardVisible(wizard);
          await runPlacementCreatePreviewFlow(wizard, {
            placementName,
            namespace,
            clusterSet,
          });
        });
      }
    );
  }
);
