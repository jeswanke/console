/**
 * RHACM4K-64222: Policy set create wizard — Placement cluster preview.
 *
 * Prereq: {@link applyPolicySetPlacementPreviewSetup} + cluster labels for policyset-test-cluster-set.
 */
import { test } from '@fixtures/acm-test';
import { POLICY_SET_PLACEMENT_PREVIEW } from '@constants/governance';
import { loadManagedClusterContext } from '@lib/cluster/managedClusterContext';
import {
  applyPolicySetPlacementPreviewSetup,
  labelClustersForPolicySetPlacementPreview,
} from '@lib/governance/policy-set-preview-setup';
import {
  verifyCreatePolicySetWizardTitle,
  verifyNoClustersMatchWarningVisible,
  verifyPlacementPreviewLinkShowsCounts,
  verifyPlacementPreviewModal,
  verifyReviewPlacementPreviewInfoAlert,
  verifyReviewPlacementPreviewWhenPresent,
} from '@lib/governance/policy-set-placement-preview-verify';

test.describe(
  'Create policy set wizard — Placement cluster preview',
  { tag: ['@governance', '@grc', '@UI', '@placement', '@placement-preview'] },
  () => {
    test.beforeAll(async ({ oc }) => {
      await applyPolicySetPlacementPreviewSetup(oc);
      const names = new Set<string>(['local-cluster']);
      for (const entry of loadManagedClusterContext()?.managedClusters ?? []) {
        if (entry?.name) names.add(entry.name);
      }
      await labelClustersForPolicySetPlacementPreview(oc, [...names]);
    });

    test(
      'RHACM4K-64222: As a governance admin, I can preview matched clusters via Placement Preview in the PolicySet wizard',
      { tag: ['@RHACM4K-64222'] },
      async ({ policySetsListPage, createPolicySetWizardPage: wizard, oc }) => {
        test.setTimeout(300_000);

        const { namespace, clusterSet, existingPlacementName } = POLICY_SET_PLACEMENT_PREVIEW;
        const policySetName = `${POLICY_SET_PLACEMENT_PREVIEW.testData.namePrefix}-${Date.now()}`;

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

        await test.step('Open Create policy set and complete General with test namespace', async () => {
          await wizard.openFromPolicySetsList(policySetsListPage);
          await verifyCreatePolicySetWizardTitle(wizard);
          await wizard.fillDetailsAndAdvanceToPlacementStep(policySetName, namespace);
          await wizard.ensureNewPlacementSelected();
        });

        await test.step('New placement — select cluster set and verify unlimited preview', async () => {
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

        await test.step('New placement — limit 1 and verify Review info alert', async () => {
          await wizard.setPlacementLimitEnabled(true);
          await wizard.setPlacementLimitValue(1);
          await verifyPlacementPreviewLinkShowsCounts(wizard, { matched: 1, total: hubTotal });
          await verifyPlacementPreviewModal(wizard, {
            expectedCounts: { matched: 1, total: hubTotal },
            expectSplitSections: hubTotal > 1,
          });
          await wizard.advanceToReviewStep();
          await verifyReviewPlacementPreviewInfoAlert(
            () => wizard.getReviewInfoPlacementPreviewAlert(),
            { matched: 1, total: hubTotal }
          );
        });

        await test.step('Placement — limit 0, modal, and Review warning', async () => {
          await wizard.clickWizardStep('placement');
          await wizard.decrementPlacementLimit();
          await verifyPlacementPreviewLinkShowsCounts(wizard, { matched: 0, total: hubTotal });
          await verifyPlacementPreviewModal(wizard, {
            expectedCounts: { matched: 0, total: hubTotal },
            expectNotMatchedClusters: managedClusterNames.slice(0, hubTotal),
          });
          await wizard.advanceToReviewStep();
          await verifyNoClustersMatchWarningVisible(wizard);
          await verifyReviewPlacementPreviewWhenPresent(wizard);
        });

        await test.step('Existing placement — preview on Placement and Review', async () => {
          await wizard.clickWizardStep('placement');
          await wizard.ensureExistingPlacementSelected();
          await wizard.selectExistingPlacement(existingPlacementName);
          await verifyPlacementPreviewLinkShowsCounts(wizard, {
            matched: hubTotal,
            total: hubTotal,
          });
          await verifyPlacementPreviewModal(wizard, {
            expectedCounts: { matched: hubTotal, total: hubTotal },
          });
          await wizard.advanceToReviewStep();
          await verifyReviewPlacementPreviewWhenPresent(wizard);
        });
      }
    );
  }
);
