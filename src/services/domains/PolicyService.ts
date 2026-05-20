import { OcCliService } from '@services/OcCliService';

/**
 * Domain service for policy-related CLI operations.
 *
 * Composes OcCliService for ConfigurationPolicy label management
 * and existence checks. No Playwright imports -- backend only.
 */
export class PolicyService {
  constructor(private readonly oc: OcCliService) {}

  async exists(
    policyName: string,
    namespace: string,
  ): Promise<boolean> {
    return this.oc
      .run(
        `oc get configurationpolicy ${policyName} -n ${namespace} --no-headers 2>/dev/null`,
      )
      .then(() => true)
      .catch(() => false);
  }

  async addLabels(
    policyName: string,
    namespace: string,
    labels: Record<string, string>,
  ): Promise<void> {
    const labelArgs = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    await this.oc.run(
      `oc label configurationpolicy ${policyName} -n ${namespace} ${labelArgs}`,
    );
  }

  async removeLabels(
    policyName: string,
    namespace: string,
    labelKeys: string[],
  ): Promise<void> {
    const removeArgs = labelKeys.map((k) => `${k}-`).join(' ');
    await this.oc
      .run(
        `oc label configurationpolicy ${policyName} -n ${namespace} ${removeArgs} 2>/dev/null || true`,
      )
      .catch(() => {});
  }

  async getLabels(
    policyName: string,
    namespace: string,
  ): Promise<string> {
    return this.oc.run(
      `oc get configurationpolicy ${policyName} -n ${namespace} -o jsonpath='{.metadata.labels}'`,
    );
  }
}
