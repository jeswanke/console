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
  verifyCreatePlacementWizardVisible,
  verifyNoClustersMatchWarningInSection,
  verifyPlacementPreviewLinkShowsCounts,
  verifyPlacementPreviewModal,
  verifyReviewPlacementPreviewInfoAlert,
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
      async ({ placementsListPage, createPlacementWizardPage: wizard, oc }) => {
        test.setTimeout(300_000);

        const { namespace, clusterSet } = PLACEMENT_CREATE_PREVIEW;
        const placementName = `${PLACEMENT_CREATE_PREVIEW.testData.namePrefix}-${Date.now()}`;

        const managedClusterNames = [
          'local-cluster',
          ...(loadManagedClusterContext()?.managedClusters?.map((c) => c.name).filter(Boolean) ??
            []),
        ].filter((name, index, arr) => arr.indexOf(name) === index);

        const hubTotal = await oc
          .run(
            `oc get managedcluster -l cluster.open-cluster-management.io/clusterset=${clusterSet} --no-headers 2>/dev/null | wc -l`
          )
          .then((out) => Number(out.trim()) || managedClusterNames.length)
          .catch(() => managedClusterNames.length);

        await test.step('Open Create placement and select preview-test-ns on General', async () => {
          await wizard.openFromPlacementsList(placementsListPage);
          await verifyCreatePlacementWizardVisible(wizard);
          await wizard.fillGeneralFields(placementName, namespace);
        });

        await test.step('Placement — select cluster set, unlimited preview', async () => {
          await wizard.clickWizardStep('placement');
          await wizard.setPlacementLimitEnabled(false);
          await wizard.selectClusterSet(clusterSet);
          await verifyPlacementPreviewLinkShowsCounts(wizard, {
            matched: hubTotal,
            total: hubTotal,
          });
          await verifyPlacementPreviewModal(wizard, {
            expectedCounts: { matched: hubTotal, total: hubTotal },
            expectMatchedClusters: managedClusterNames.slice(0, hubTotal),
          });
        });

        await test.step('Placement — limit 1 with matched / not matched sections', async () => {
          await wizard.setPlacementLimitEnabled(true);
          await wizard.setPlacementLimitValue(1);
          await verifyPlacementPreviewLinkShowsCounts(wizard, { matched: 1, total: hubTotal });
          await verifyPlacementPreviewModal(wizard, {
            expectedCounts: { matched: 1, total: hubTotal },
            expectSplitSections: hubTotal > 1,
          });
        });

        await test.step('Placement — limit 0', async () => {
          await wizard.decrementPlacementLimit();
          await verifyPlacementPreviewLinkShowsCounts(wizard, { matched: 0, total: hubTotal });
          await verifyPlacementPreviewModal(wizard, {
            expectedCounts: { matched: 0, total: hubTotal },
            expectNotMatchedClusters: managedClusterNames.slice(0, hubTotal),
          });
        });

        await test.step('Review — info alert with preview counts (limit 0)', async () => {
          await wizard.advanceToReviewStep();
          await verifyReviewPlacementPreviewInfoAlert(
            () => wizard.getReviewInfoPlacementPreviewAlert(),
            { matched: 0, total: hubTotal }
          );
        });

        await test.step('Review — expand Placement and verify no-match warning', async () => {
          await wizard.expandReviewPlacementSection();
          await verifyNoClustersMatchWarningInSection(wizard.getReviewPlacementSection());
        });

        await test.step('Review — info alert after limit 1 (return to Placement)', async () => {
          await wizard.clickWizardStep('placement');
          await wizard.setPlacementLimitValue(1);
          await wizard.advanceToReviewStep();
          await verifyReviewPlacementPreviewInfoAlert(
            () => wizard.getReviewInfoPlacementPreviewAlert(),
            { matched: 1, total: hubTotal }
          );
        });
      }
    );
  }
);
