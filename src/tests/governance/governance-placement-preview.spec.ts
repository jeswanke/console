/** RHACM4K-64221 / RHACM4K-64222 — Policy and Policy set create wizards, placement cluster preview. */
import { test } from '@fixtures/acm-test';
import { POLICY_PLACEMENT_PREVIEW, POLICY_SET_PLACEMENT_PREVIEW } from '@constants/governance';
import { loadManagedClusterContext } from '@lib/cluster/managedClusterContext';
import {
  applyPolicyPlacementPreviewSetup,
  cleanupPolicyPlacementPreviewSetup,
  labelClustersForPolicyPreviewTest,
} from '@lib/governance/policy-preview-setup';
import {
  runPolicyPlacementPreviewFlow,
  verifyCreatePolicyWizardTitle,
} from '@lib/governance/policy-placement-preview-verify';
import {
  applyPolicySetPlacementPreviewSetup,
  cleanupPolicySetPlacementPreviewSetup,
  labelClustersForPolicySetPlacementPreview,
} from '@lib/governance/policy-set-preview-setup';
import {
  runPolicySetPlacementPreviewFlow,
  verifyCreatePolicySetWizardTitle,
} from '@lib/governance/policy-set-placement-preview-verify';

function managedClusterNamesForPreview(): string[] {
  const names = new Set<string>(['local-cluster']);
  for (const entry of loadManagedClusterContext()?.managedClusters ?? []) {
    if (entry?.name) names.add(entry.name);
  }
  return [...names];
}

test.describe(
  'Governance create wizards — Placement cluster preview',
  { tag: ['@governance', '@grc', '@UI', '@placement', '@placement-preview'] },
  () => {
    test.beforeAll(async ({ oc }) => {
      await applyPolicyPlacementPreviewSetup(oc);
      await applyPolicySetPlacementPreviewSetup(oc);
    });

    test.afterAll(async ({ oc }) => {
      await cleanupPolicyPlacementPreviewSetup(oc);
      await cleanupPolicySetPlacementPreviewSetup(oc);
    });

    test(
      'RHACM4K-64221: As a governance admin, I can preview matched clusters via the Placement Preview feature in the Policy wizard',
      { tag: ['@RHACM4K-64221'] },
      async ({ oc, policiesListPage, createPolicyWizardPage: wizard }) => {
        test.setTimeout(300_000);

        await labelClustersForPolicyPreviewTest(oc, managedClusterNamesForPreview());

        const { namespace, clusterSet, testData } = POLICY_PLACEMENT_PREVIEW;
        const policyName = `${testData.namePrefix}-${Date.now()}`;

        await test.step('Open Create policy and run new-placement preview scenarios', async () => {
          await wizard.openFromPoliciesList(policiesListPage);
          await verifyCreatePolicyWizardTitle(wizard);
          await runPolicyPlacementPreviewFlow(wizard, {
            policyName,
            namespace,
            clusterSet,
          });
        });
      }
    );

    test(
      'RHACM4K-64222: As a governance admin, I can preview matched clusters via Placement Preview in the PolicySet wizard',
      { tag: ['@RHACM4K-64222'] },
      async ({ oc, policySetsListPage, createPolicySetWizardPage: wizard }) => {
        test.setTimeout(300_000);

        await labelClustersForPolicySetPlacementPreview(oc, managedClusterNamesForPreview());

        const { namespace, clusterSet, testData } = POLICY_SET_PLACEMENT_PREVIEW;
        const policySetName = `${testData.namePrefix}-${Date.now()}`;

        await test.step('Open Create policy set and run new-placement preview scenarios', async () => {
          await wizard.openFromPolicySetsList(policySetsListPage);
          await verifyCreatePolicySetWizardTitle(wizard);
          await runPolicySetPlacementPreviewFlow(wizard, {
            policySetName,
            namespace,
            clusterSet,
          });
        });
      }
    );
  }
);
