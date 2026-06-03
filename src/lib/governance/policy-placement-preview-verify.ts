/** RHACM4K-64221 — Policy create wizard placement preview. */
import type { CreatePolicyWizardPage } from '@pages/governance/CreatePolicyWizardPage';
import { runGovernanceNewPlacementPreviewScenarios } from '@lib/placement/placement-preview-flow';

export { verifyCreatePolicyWizardTitle } from '@lib/governance/policy-create-verify';

export type PolicyPlacementPreviewOptions = {
  policyName: string;
  namespace: string;
  clusterSet: string;
  existingPlacementName?: string;
};

export async function runPolicyPlacementPreviewFlow(
  wizard: CreatePolicyWizardPage,
  options: PolicyPlacementPreviewOptions
): Promise<void> {
  const { policyName, namespace, clusterSet } = options;
  await wizard.fillDetailsAndAdvanceToPlacementStep(policyName, namespace);
  await runGovernanceNewPlacementPreviewScenarios(wizard, clusterSet);
}
