/** RHACM4K-64222 — Policy set create wizard placement preview. */
import type { CreatePolicySetWizardPage } from '@pages/governance/CreatePolicySetWizardPage';
import { runGovernanceNewPlacementPreviewScenarios } from '@lib/placement/placement-preview-flow';

export { verifyCreatePolicySetWizardTitle } from '@lib/governance/policy-set-create-verify';

export type PolicySetPlacementPreviewOptions = {
  policySetName: string;
  namespace: string;
  clusterSet: string;
  existingPlacementName?: string;
};

export async function runPolicySetPlacementPreviewFlow(
  wizard: CreatePolicySetWizardPage,
  options: PolicySetPlacementPreviewOptions
): Promise<void> {
  const { policySetName, namespace, clusterSet } = options;
  await wizard.fillDetailsAndAdvanceToPlacementStep(policySetName, namespace);
  await runGovernanceNewPlacementPreviewScenarios(wizard, clusterSet);
}
