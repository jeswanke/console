import { OcCliService } from '@services/OcCliService';

const oc = new OcCliService();

export async function ensurePolicyLabelsClean(
  policyName: string,
  namespace: string,
  labelKeys: string[],
): Promise<boolean> {
  const exists = await oc.policyExists(policyName, namespace);
  if (exists) {
    await oc.policyRemoveLabels(policyName, namespace, labelKeys);
  }
  return exists;
}

export async function cleanupPolicyLabels(
  policyName: string,
  namespace: string,
  labelKeys: string[],
): Promise<void> {
  await oc.policyRemoveLabels(policyName, namespace, labelKeys);
}
