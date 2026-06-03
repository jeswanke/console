/**
 * Policy create wizard — Placement cluster preview (hub-aligned selectors from Playwriter).
 *
 * Prereq: {@link applyPolicyPlacementPreviewSetup} + cluster set labels on managed clusters.
 */
import { test } from '@fixtures/acm-test';
import { POLICY_PLACEMENT_PREVIEW } from '@constants/governance';
import { loadManagedClusterContext } from '@lib/cluster/managedClusterContext';
import {
  applyPolicyPlacementPreviewSetup,
  labelClustersForPolicyPreviewTest,
} from '@lib/governance/policy-preview-setup';
import {
  verifyNoClustersMatchWarningVisible,
  verifyPlacementPreviewLinkShowsCounts,
  verifyPlacementPreviewModal,
  verifyReviewPlacementPreviewWhenPresent,
} from '@lib/governance/policy-placement-preview-verify';
import { verifyCreatePolicyWizardTitle } from '@lib/governance/policy-create-verify';

test.describe(
  'Create policy wizard — Placement cluster preview',
  { tag: ['@governance', '@grc', '@UI', '@placement', '@placement-preview'] },
  () => {
    test.beforeAll(async ({ oc }) => {
      await applyPolicyPlacementPreviewSetup(oc);
      const ctx = loadManagedClusterContext();
      const names = new Set<string>(['local-cluster']);
      for (const entry of ctx?.managedClusters ?? []) {
        if (entry?.name) names.add(entry.name);
      }
      await labelClustersForPolicyPreviewTest(oc, [...names]);
    });

    test(
      'As an admin, I can preview matched and unmatched clusters when configuring policy placement',
      async ({ policiesListPage, createPolicyWizardPage: wizard, oc }) => {
        test.setTimeout(300_000);

        const { namespace, clusterSet, existingPlacementName } = POLICY_PLACEMENT_PREVIEW;
        const policyName = `${POLICY_PLACEMENT_PREVIEW.testData.namePrefix}-${Date.now()}`;

        const managedClusterNames = [
          'local-cluster',
          ...(loadManagedClusterContext()?.managedClusters?.map((c) => c.name).filter(Boolean) ??
            []),
        ].filter((name, index, arr) => arr.indexOf(name) === index);
        const totalClusters = Math.max(
          2,
          managedClusterNames.filter((n) => n === 'local-cluster' || n !== 'local-cluster').length
        );
        const hubTotal = await oc
          .run(
            `oc get managedcluster -l cluster.open-cluster-management.io/clusterset=${clusterSet} --no-headers 2>/dev/null | wc -l`
          )
          .then((out) => Number(out.trim()) || totalClusters)
          .catch(() => totalClusters);

        await test.step('Open Create policy and complete General with test namespace', async () => {
          await wizard.openFromPoliciesList(policiesListPage);
          await verifyCreatePolicyWizardTitle(wizard);
          await wizard.fillDetailsAndAdvanceToPlacementStep(policyName, namespace);
          await wizard.ensureNewPlacementSelected();
        });

        await test.step('New placement — select cluster set and verify unlimited preview', async () => {
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

        await test.step('New placement — limit 1 shows split matched / not matched', async () => {
          await wizard.setPlacementLimitEnabled(true);
          await wizard.setPlacementLimitValue(1);
          await verifyPlacementPreviewLinkShowsCounts(wizard, { matched: 1, total: hubTotal });
          await verifyPlacementPreviewModal(wizard, {
            expectedCounts: { matched: 1, total: hubTotal },
            expectSplitSections: hubTotal > 1,
          });
        });

        await test.step('New placement — limit 0 shows zero matches', async () => {
          await wizard.decrementPlacementLimit();
          await verifyPlacementPreviewLinkShowsCounts(wizard, { matched: 0, total: hubTotal });
          await verifyPlacementPreviewModal(wizard, {
            expectedCounts: { matched: 0, total: hubTotal },
            expectNotMatchedClusters: managedClusterNames.slice(0, hubTotal),
          });
        });

        await test.step('Review — warning when no clusters match (limit 0)', async () => {
          await wizard.advanceToReviewStep();
          await verifyNoClustersMatchWarningVisible(wizard);
          await verifyReviewPlacementPreviewWhenPresent(wizard);
        });

        await test.step('Existing placement — preview on Placement and Review when link is shown', async () => {
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
