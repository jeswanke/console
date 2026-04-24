/**
 * Verifies merged YAML + domain resolution (no browser).
 */
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  clearE2eSpecDataCache,
  getApplicationExpectationsPayload,
  getE2eScenario,
  getSubscriptionDomainPayload,
  getTestDataForE2e,
  loadE2eSpecData,
  mergeApplicationExpectationsLayers,
  mergeExpectationsRowsForComposerBlock,
} from '@config/e2e-spec-loader';

const E2E_SPEC_DATA_DIR = path.join(process.cwd(), 'src/config/e2e-spec-data');

test.beforeEach(() => {
  clearE2eSpecDataCache();
});

test.describe('e2e-spec-data YAML processing', () => {
  test('applications/_shared.yaml: Git URL YAML anchor resolves to full string on every repository entry', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    const expected = 'https://github.com/stolostron/application-lifecycle-samples.git';

    const single = spec.fragments.repo_samples_default?.repositories as
      | Array<{ url?: unknown }>
      | undefined;
    expect(single?.[0]?.url).toBe(expected);
    expect(single?.[0]?.url).not.toMatch(/^\*/);

    const multi = spec.fragments.repo_samples_dual?.repositories as
      | Array<{ url?: unknown }>
      | undefined;
    expect(multi?.[0]?.url).toBe(expected);
    expect(multi?.[1]?.url).toBe(expected);
  });

  test('merged data includes shared fragment and subscription scenarios', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);

    const repos = spec.fragments.repo_samples_default?.repositories as
      | Array<Record<string, unknown>>
      | undefined;
    expect(repos?.[0]).toMatchObject({
      kind: 'git',
      branch: 'main',
      path: 'helloworld',
    });
    expect(spec.profiles.subscription_full_wizard).toEqual({ fillEntireWizard: true });
    expect(spec.profiles.subscription_submit).toEqual({
      fillEntireWizard: false,
      submit: true,
      ensureFormMode: true,
    });
    expect(spec.scenarios.smoke_subscription).toBeDefined();
    expect(spec.scenarios.matrix_example_subscription?.tests).toContain('RHACM4K-MATRIX-0001');
  });

  test('smoke_subscription resolves subscription domain with merged repositories and perBlock wizard config', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    expect(spec.scenarios.smoke_subscription?.blocks).toHaveLength(1);

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
    const smokePb = sub.perBlock as Array<Record<string, unknown>> | undefined;
    expect(smokePb?.[0]?.timeWindow).toMatchObject({ timezone: 'America/Toronto' });
    expect(smokePb?.[0]?.clusterDeployment).toMatchObject({ clusterSet: 'global' });
  });

  test('getTestDataForE2e resolves testcase id from scenario tests', () => {
    const rows = getTestDataForE2e('RHACM4K-MATRIX-0001', E2E_SPEC_DATA_DIR);
    expect(rows).toHaveLength(1);
    expect(rows[0].scenarioId).toBe('matrix_example_subscription');
    expect(getSubscriptionDomainPayload(rows[0]).applicationName).toBe('e2e-matrix-app');
  });

  test('auto_git_multi: scenario.blocks composes subscription + applicationExpectations', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    const entry = spec.scenarios.auto_git_multi;
    expect(entry?.blocks).toHaveLength(2);
    expect(entry?.blocks?.[0]?.use).toContain('git_helloworld');
    expect(entry?.blocks?.[1]?.use).toContain('git_mortgage');

    const resolved = getE2eScenario('auto_git_multi', E2E_SPEC_DATA_DIR);
    const sub = getSubscriptionDomainPayload(resolved);

    expect(sub.submit).toBe(true);
    expect(sub.repositories).toHaveLength(2);
    expect(sub.repositories?.[0]).toMatchObject({ path: 'helloworld', reconcileOption: 'merge' });
    expect(sub.repositories?.[1]).toMatchObject({ path: 'mortgage' });

    const pb = sub.perBlock as Array<Record<string, unknown>> | undefined;
    expect(pb?.[0]?.timeWindow).toBeDefined();
    expect(pb?.[0]?.timeWindow).toMatchObject({ mode: 'default' });
    expect(pb?.[1]?.timeWindow).toMatchObject({ mode: 'default' });
    expect(pb?.[0]?.automation).toMatchObject({ credentialTypeFilter: 'Ansible' });
    expect(pb?.[0]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
    });
    expect(pb?.[1]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
    });

    const appExp = getApplicationExpectationsPayload(resolved);
    expect(appExp.clusterResourcesFlat.every((r) => r.namespace === 'auto-git-multi-ns')).toBe(true);
    expect(appExp.clusterResourcesFlat).toHaveLength(9);
    expect(appExp.clusterResources).toHaveLength(2);
    expect(appExp.clusterResourcesPerRepo).toHaveLength(2);
    expect(appExp.clusterResourcesPerRepo[0]).toMatchObject({
      repositoryIndex: 0,
      repositoryPath: 'helloworld',
      repositoryKind: 'git',
    });
    expect(appExp.clusterResourcesPerRepo[0]!.rows).toHaveLength(5);
    expect(appExp.clusterResourcesPerRepo[1]).toMatchObject({
      repositoryIndex: 1,
      repositoryPath: 'mortgage',
      repositoryKind: 'git',
    });
    expect(appExp.clusterResourcesPerRepo[1]!.rows).toHaveLength(4);
    expect(appExp.clusterResources[0]).toHaveLength(5);
    expect(appExp.clusterResources[1]).toHaveLength(4);
    expect(appExp.clusterResourcesFlat).toHaveLength(9);
    expect(appExp.clusterResourcesFlat.map((r) => r.kind)).toEqual(
      expect.arrayContaining(['Route', 'Deployment', 'Service', 'ReplicaSet', 'Pod'])
    );
    expect(appExp.clusterResources[0]!.map((r) => r.kind)).toContain('Deployment');
    expect(appExp.clusterResources[1]!.map((r) => r.kind)).not.toContain('Route');
  });

  test('mergeExpectationsRowsForComposerBlock: one outer clusterResources slot applies to any lane index', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    const use = ['git_mortgage'];
    const at0 = mergeExpectationsRowsForComposerBlock(spec, 'auto_git_multi', use, 0);
    const at1 = mergeExpectationsRowsForComposerBlock(spec, 'auto_git_multi', use, 1);
    expect(at0).toEqual(at1);
    expect(at0).toHaveLength(4);
  });

  test('applicationExpectations clusterResources merge concats rows per repository index', () => {
    const merged = mergeApplicationExpectationsLayers(
      {
        clusterResources: [
          [{ kind: 'A', name: '1', namespace: 'ns' }],
          [{ kind: 'B', name: '2', namespace: 'ns' }],
        ],
      },
      {
        clusterResources: [
          [{ kind: 'C', name: '3', namespace: 'ns' }],
          [],
        ],
      }
    );
    expect(merged.clusterResources).toEqual([
      [
        { kind: 'A', name: '1', namespace: 'ns' },
        { kind: 'C', name: '3', namespace: 'ns' },
      ],
      [{ kind: 'B', name: '2', namespace: 'ns' }],
    ]);
  });
});
