import { resolveAnsibleScaleSuiteConfig } from '@config/e2e-spec-loader/ansible-scale-api';
import { resolveRepoPath } from '@lib/oc/apply-yaml-template';
import type { OcCliService } from '@services/OcCliService';

/**
 * Suite prep for ansible large-scale tests: fake Tower secret + AnsibleJob CRD (idempotent).
 * Paths from e2e-spec-data profile `ansible_scale_suite`.
 */
export async function ensureAnsibleScaleSuitePrep(oc: OcCliService): Promise<void> {
  const suite = resolveAnsibleScaleSuiteConfig();
  await oc.applyYaml(resolveRepoPath(suite.fakeSecretYamlRelativePath));
  await oc.applyYaml(resolveRepoPath(suite.ansibleJobCrdYamlRelativePath));
}
