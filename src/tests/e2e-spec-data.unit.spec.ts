/**
 * Verifies merged YAML + domain resolution (no browser).
 */
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  clearE2eSpecDataCache,
  getE2eScenario,
  getSubscriptionDomainPayload,
  getTestDataForE2e,
  loadE2eSpecData,
} from '@config/e2e-spec-loader';

const E2E_SPEC_DATA_DIR = path.join(process.cwd(), 'src/config/e2e-spec-data');

test.beforeEach(() => {
  clearE2eSpecDataCache();
});

test.describe('e2e-spec-data YAML processing', () => {
  test('applications/_shared.yaml: Git URL YAML anchor resolves to full string on every repository entry', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    const expected = 'https://github.com/stolostron/application-lifecycle-samples.git';

    const single = spec.fragments.git_application_lifecycle_samples?.repositories as
      | Array<{ url?: unknown }>
      | undefined;
    expect(single?.[0]?.url).toBe(expected);
    expect(single?.[0]?.url).not.toMatch(/^\*/);

    const multi = spec.fragments.git_repos_auto_git_multi?.repositories as
      | Array<{ url?: unknown }>
      | undefined;
    expect(multi?.[0]?.url).toBe(expected);
    expect(multi?.[1]?.url).toBe(expected);
  });

  test('merged data includes shared fragment and subscription scenarios', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);

    const repos = spec.fragments.git_application_lifecycle_samples?.repositories as
      | Array<Record<string, unknown>>
      | undefined;
    expect(repos?.[0]).toMatchObject({
      kind: 'git',
      branch: 'main',
      path: 'helloworld',
    });
    expect(spec.profiles.subscription_full_wizard).toEqual({ fillEntireWizard: true });
    expect(spec.scenarios.smoke_subscription).toBeDefined();
    expect(spec.scenarios.matrix_example_subscription?.tests).toContain('RHACM4K-MATRIX-0001');
  });

  test('smoke_subscription resolves subscription domain with merged repositories and wizard defaults', () => {
    const resolved = getE2eScenario('smoke_subscription', E2E_SPEC_DATA_DIR);

    expect(resolved.enabled).toBe(true);
    expect(resolved.testIds).toContain('RHACM4K-SMOKE-SUBSCRIPTION');

    const sub = getSubscriptionDomainPayload(resolved);
    expect(sub.applicationName).toBe('e2e-spec-data-smoke-app');
    expect(sub.namespace).toBe('e2e-spec-data-smoke-ns');
    expect(sub.submit).toBe(false);
    expect(sub.fillEntireWizard).toBe(true);
    expect(sub.repositories?.[0]).toMatchObject({
      kind: 'git',
      url: expect.stringContaining('application-lifecycle-samples'),
      path: 'helloworld',
    });
  });

  test('getTestDataForE2e resolves testcase id from scenario tests', () => {
    const rows = getTestDataForE2e('RHACM4K-MATRIX-0001', E2E_SPEC_DATA_DIR);
    expect(rows).toHaveLength(1);
    expect(rows[0].scenarioId).toBe('matrix_example_subscription');
    expect(getSubscriptionDomainPayload(rows[0]).applicationName).toBe('e2e-matrix-app');
  });

  test('auto_git_multi merges composable fragments into subscription domain', () => {
    const resolved = getE2eScenario('auto_git_multi', E2E_SPEC_DATA_DIR);
    const sub = getSubscriptionDomainPayload(resolved);

    expect(sub.repositories).toHaveLength(2);
    expect(sub.repositories?.[0]).toMatchObject({ path: 'helloworld', reconcileOption: 'merge' });
    expect(sub.repositories?.[1]).toMatchObject({ path: 'mortgage' });

    const pb = sub.perBlock as Array<Record<string, unknown>> | undefined;
    expect(pb?.[0]?.timeWindow).toBeDefined();
    expect(pb?.[0]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
    });
    expect(pb?.[1]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
    });
  });
});
