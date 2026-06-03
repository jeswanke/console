/**
 * RHACM4K-64221 / RHACM4K-64222 — Policy and Policy set create wizards, placement cluster preview.
 *
 * Scenario data: `src/config/e2e-spec-data/governance/placement-preview.yaml`.
 */
import { test } from '@fixtures/acm-test';
import {
  resolvePolicyScenarioByTestId,
  resolvePolicySetScenarioByTestId,
} from '@config';
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

const policyPreviewScenario = resolvePolicyScenarioByTestId('RHACM4K-64221');
const policySetPreviewScenario = resolvePolicySetScenarioByTestId('RHACM4K-64222');

test.describe(
  'Governance create wizards — Placement cluster preview',
  { tag: ['@governance', '@grc', '@UI', '@placement', '@placement-preview'] },
  () => {
    test.beforeAll(async ({ oc }) => {
      await applyPolicyPlacementPreviewSetup(oc, policyPreviewScenario.policy);
      await applyPolicySetPlacementPreviewSetup(oc, policySetPreviewScenario.policySet);
    });

    test.afterAll(async ({ oc }) => {
      await cleanupPolicyPlacementPreviewSetup(oc, policyPreviewScenario.policy);
      await cleanupPolicySetPlacementPreviewSetup(oc, policySetPreviewScenario.policySet);
    });

    test(
      'RHACM4K-64221: As a governance admin, I can preview matched clusters via the Placement Preview feature in the Policy wizard',
      { tag: ['@RHACM4K-64221'] },
      async ({ oc, policiesListPage, createPolicyWizardPage: wizard }) => {
        test.setTimeout(300_000);

        const { namespace, clusterSet, namePrefix } = policyPreviewScenario.policy;
        await labelClustersForPolicyPreviewTest(oc, managedClusterNamesForPreview(), clusterSet);

        const policyName = `${namePrefix}-${Date.now()}`;

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

        const { namespace, clusterSet, namePrefix } = policySetPreviewScenario.policySet;
        await labelClustersForPolicySetPlacementPreview(oc, managedClusterNamesForPreview(), clusterSet);

        const policySetName = `${namePrefix}-${Date.now()}`;

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
