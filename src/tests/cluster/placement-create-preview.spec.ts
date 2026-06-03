/**
 * RHACM4K-64220: Standalone Create placement wizard — Placement cluster preview.
 *
 * Prereq: {@link applyPlacementCreatePreviewSetup} + cluster labels for preview-test-cluster-set.
 */
import { test } from '@fixtures/acm-test';
import { PLACEMENT_CREATE_PREVIEW } from '@constants/placement-preview';
import { loadManagedClusterContext } from '@lib/cluster/managedClusterContext';
import {
  applyPlacementCreatePreviewSetup,
  labelClustersForPlacementCreatePreview,
} from '@lib/cluster/placement-preview-setup';
import {
  runPlacementCreatePreviewFlow,
  verifyCreatePlacementWizardVisible,
} from '@lib/cluster/placement-create-preview-verify';

test.describe(
  'Infrastructure Placements create wizard — cluster preview',
  { tag: ['@cluster', '@clc', '@UI', '@placement', '@placement-preview'] },
  () => {
    test.beforeAll(async ({ oc }) => {
      await applyPlacementCreatePreviewSetup(oc);
      const names = new Set<string>(['local-cluster']);
      for (const entry of loadManagedClusterContext()?.managedClusters ?? []) {
        if (entry?.name) names.add(entry.name);
      }
      await labelClustersForPlacementCreatePreview(oc, [...names]);
    });

    test(
      'RHACM4K-64220: As an admin, I can preview matched clusters via Placement Preview in the standalone Placement wizard',
      { tag: ['@RHACM4K-64220'] },
      async ({ placementsListPage, createPlacementWizardPage: wizard }) => {
        test.setTimeout(300_000);

        const { namespace, clusterSet, testData } = PLACEMENT_CREATE_PREVIEW;
        const placementName = `${testData.namePrefix}-${Date.now()}`;

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
