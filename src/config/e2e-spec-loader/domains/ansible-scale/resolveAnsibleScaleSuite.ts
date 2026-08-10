import { ansibleScaleSuiteSchema, type AnsibleScaleSuitePayload } from './ansibleScaleSchema';
import { loadE2eSpecData } from '../../io/loadSpec';

const SUITE_PROFILE = 'ansible_scale_suite';

/** Reads shared suite prep paths from profile `ansible_scale_suite`. */
export function resolveAnsibleScaleSuiteConfig(configPath?: string): AnsibleScaleSuitePayload {
  const spec = loadE2eSpecData(configPath);
  const profile = spec.profiles[SUITE_PROFILE];
  if (!profile) {
    throw new Error(
      `e2e-spec-data: missing profile "${SUITE_PROFILE}" for ansible scale suite prep`
    );
  }
  const overlay = (profile.specDomains as Record<string, unknown> | undefined)?.ansibleScaleSuite;
  if (!overlay || typeof overlay !== 'object' || Object.keys(overlay).length === 0) {
    throw new Error(
      `e2e-spec-data: profile "${SUITE_PROFILE}" must define specDomains.ansibleScaleSuite`
    );
  }
  return ansibleScaleSuiteSchema.parse(overlay);
}
