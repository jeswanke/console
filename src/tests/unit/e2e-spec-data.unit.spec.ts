/**
 * Verifies merged YAML + domain resolution (no browser).
 */
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  clearE2eSpecDataCache,
  findScenarioIdsByTestId,
  loadE2eSpecData,
  mergeApplicationExpectationsLayers,
  mergeExpectationsRowsForComposerBlock,
  resolveArgoPushScenarioById,
  resolveArgoPushScenarioByTestId,
  resolveFluxScenarioById,
  resolveFluxScenarioByTestId,
  resolveFluxScenarioPair,
  resolveOpenshiftScenarioByTestId,
  resolveAnsibleScaleScenarioByTestId,
  resolveAnsibleScaleSuiteConfig,
  resolvePlacementScenarioByTestId,
  resolvePolicyScenarioByTestId,
  resolvePolicySetScenarioByTestId,
  resolveScenarioByTestId,
  resolveSubscriptionScenarioById,
  resolveSubscriptionScenarioByTestId,
} from '@config/e2e-spec-loader';
import { resolveSubscriptionDomain } from '@config/e2e-spec-loader/domains/subscription/resolveSubscriptionDomain';

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

    const scenarioEntry = spec.scenarios.smoke_subscription!;
    expect(scenarioEntry.tests).toContain('RHACM4K-SMOKE-SUBSCRIPTION');

    const subResolved = resolveSubscriptionDomain(spec, 'smoke_subscription', scenarioEntry)!;
    expect(subResolved.applicationName).toBe('e2e-spec-data-smoke-app');
    expect(subResolved.namespace).toBe('e2e-spec-data-smoke-ns');
    expect(subResolved.submit).toBe(false);
    expect(subResolved.fillEntireWizard).toBe(true);
    expect(subResolved.repositories?.[0]).toMatchObject({
      kind: 'git',
      url: expect.stringContaining('application-lifecycle-samples'),
      path: 'helloworld',
    });
    const smokePb = subResolved.perBlock as Array<Record<string, unknown>> | undefined;
    expect(smokePb?.[0]?.timeWindow).toMatchObject({ timezone: 'America/Toronto' });
    expect(smokePb?.[0]?.clusterDeployment).toMatchObject({ clusterSet: 'global' });
  });

  test('findScenarioIdsByTestId resolves testcase id from scenario tests', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    const ids = findScenarioIdsByTestId(spec, 'RHACM4K-MATRIX-0001');
    expect(ids).toEqual(['matrix_example_subscription']);
    const entry = spec.scenarios.matrix_example_subscription!;
    const sub = resolveSubscriptionDomain(spec, ids[0]!, entry);
    expect(sub?.applicationName).toBe('e2e-matrix-app');
  });

  test('resolveScenarioByTestId returns subscription and applicationExpectations for Polarion id', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-7484', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_helloworld_local');
    expect(resolved.subscription.applicationName).toBeTruthy();
    expect(resolved.applicationExpectations.topologyClusterResourceBlocks.length).toBeGreaterThan(
      0
    );
  });

  test('auto_git_underscore: RHACM4K-39666 underscore URL and online vendor/OpenShift placement', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-39666', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_underscore');
    expect(resolved.subscription.applicationName).toBe('auto-git-underscore');
    expect(resolved.subscription.namespace).toBe('auto-git-underscore-ns');
    expect(resolved.subscription.repositories?.[0]?.url).toBe(
      'https://github.com/ruici-h/app_samples'
    );
    expect(resolved.subscription.perBlock?.[0]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
      labelSelectorRows: [{ labelName: 'vendor', labelValue: 'OpenShift' }],
    });
    expect(resolved.applicationExpectations.clusterResources[0]).toHaveLength(3);
    expect(resolved.applicationExpectations.clusterResources[0]!.map((r) => r.kind)).toEqual([
      'Route',
      'Service',
      'ReplicaSet',
    ]);
    expect(resolved.applicationExpectations.advancedConfiguration?.channelDisplaySubstring).toBe(
      'app_samples'
    );
  });

  test('auto_git_multi: scenario.blocks composes subscription + applicationExpectations', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    const entry = spec.scenarios.auto_git_multi;
    expect(entry?.blocks).toHaveLength(2);
    expect(entry?.blocks?.[0]?.use).toContain('git_helloworld');
    expect(entry?.blocks?.[1]?.use).toContain('git_mortgage');

    const resolved = resolveSubscriptionScenarioById('auto_git_multi', E2E_SPEC_DATA_DIR);
    const sub = resolved.subscription;

    expect(sub.submit).toBe(true);
    expect(sub.repositories).toHaveLength(2);
    expect(sub.repositories?.[0]).toMatchObject({ path: 'helloworld', reconcileOption: 'merge' });
    expect(sub.repositories?.[1]).toMatchObject({ path: 'mortgage' });

    const pb = sub.perBlock as Array<Record<string, unknown>> | undefined;
    expect(pb?.[0]?.timeWindow).toBeDefined();
    expect(pb?.[0]?.timeWindow).toMatchObject({ mode: 'default' });
    expect(pb?.[1]?.timeWindow).toMatchObject({ mode: 'default' });
    expect(pb?.[0]?.automation).toEqual({});
    expect(pb?.[0]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
    });
    expect(pb?.[1]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
    });

    const appExp = resolved.applicationExpectations;
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

    expect(appExp.topologyClusterResourceBlocks).toHaveLength(2);
    expect(appExp.topologyClusterResourceBlocks[0]).toEqual(
      appExp.clusterResources[0]!.map(({ kind, name }) => ({ kind, name }))
    );
    expect(appExp.topologyClusterResourceBlocks[1]).toEqual(
      appExp.clusterResources[1]!.map(({ kind, name }) => ({ kind, name }))
    );
    expect(appExp.detailsClustersSummary).toEqual({ variant: 'localOnly' });
  });

  test('auto_git_crd: RHACM4K-10668 CRD path, disable auto-reconcile, online placement', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-10668', E2E_SPEC_DATA_DIR);
    const sub = resolved.subscription;
    const appExp = resolved.applicationExpectations;

    expect(sub.applicationName).toBe('auto-git-crd');
    expect(sub.namespace).toBe('auto-git-crd-ns');
    expect(sub.repositories).toHaveLength(1);
    expect(sub.repositories?.[0]).toMatchObject({
      path: 'crd',
      disableAutoReconcile: true,
    });
    expect(sub.perBlock?.[0]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
      labelSelectorRows: [{ labelName: 'vendor', labelValue: 'OpenShift' }],
    });
    expect(appExp.clusterResources[0]).toHaveLength(2);
    expect(appExp.clusterResources[0]!.map((r) => r.kind)).toEqual([
      'Secret',
      'CustomResourceDefinition',
    ]);
    expect(appExp.detailsClustersSummary).toBeUndefined();
  });

  test('auto_git_multi_delete: RHACM4K-1558 multi-sub with vendor placement + local mortgage', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-1558', E2E_SPEC_DATA_DIR);
    const sub = resolved.subscription;

    expect(sub.applicationName).toBe('auto-git-multi-delete');
    expect(sub.namespace).toBe('auto-git-multi-delete-ns');
    expect(sub.repositories).toHaveLength(2);
    expect(sub.repositories?.[0]).toMatchObject({ path: 'helloworld' });
    expect(sub.repositories?.[1]).toMatchObject({ path: 'mortgage' });

    const pb = sub.perBlock as Array<Record<string, unknown>> | undefined;
    expect(pb?.[0]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
      labelSelectorRows: [{ labelName: 'vendor', labelValue: 'OpenShift' }],
    });
    expect(pb?.[1]?.clusterDeployment).toMatchObject({
      useClusterLabelSelector: true,
      clusterSet: 'global',
      labelSelectorRows: [{ labelName: 'name', labelValue: 'local-cluster' }],
    });
  });

  test('auto_git_commit_hash_test7513: RHACM4K-7513 resolves by Polarion id', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-7513', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_commit_hash_test7513');
    expect(resolved.subscription.applicationName).toBe('ui-git-commit');
    expect(resolved.subscription.repositories?.[0]).toMatchObject({
      kind: 'git',
      branch: 'test7513',
      path: 'example-k8s-app',
      desiredCommit: '741bd4220fc932186122890f85cb5d0aaf8415f5',
    });
  });

  test('auto_git_placement_topology: RHACM4K-41356 resolves by Polarion id', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-41356', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_placement_topology');
    expect(resolved.subscription.applicationName).toBe('api-git-local');
  });

  test('auto_git_ansible_cred_wizard_20541: RHACM4K-20541 resolves ansible credential wizard scenario', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-20541', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_ansible_cred_wizard_20541');
    expect(resolved.subscription.applicationName).toBe('auto-git-ansible-cred-wizard');
    expect(resolved.subscription.namespace).toBe('auto-git-ansible-cred-wizard-ns');
    expect(resolved.subscription.repositories?.[0]).toMatchObject({
      kind: 'git',
      path: 'ansible',
      branch: 'main',
    });
    expect(resolved.subscription.perBlock?.[0]?.automation?.addCredentialWizard).toEqual({
      secretName: 'ansible-tower-wizard',
      secretNamespace: 'default',
    });
    expect(resolved.applicationExpectations?.detailsClustersSummary).toEqual({ variant: 'localOnly' });
    expect(resolved.applicationExpectations?.successMinResourceCount).toBe(4);
    expect(resolved.applicationExpectations?.topologyDeployableResourceTypes).toEqual([
      'configmap',
      'ansiblejob',
    ]);
    expect(resolved.applicationExpectations?.topologySubscriptionHooks).toEqual([
      'prehook',
      'posthook',
    ]);
    expect(resolved.applicationExpectations?.localClusterPlacement).toBe(true);
    expect(resolved.applicationExpectations?.clusterResources[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'ConfigMap', name: 'guestbook-cfgmap' }),
        expect.objectContaining({ kind: 'AnsibleJob', name: 'ansible-regular-test' }),
      ])
    );
  });

  test('auto_git_ansible_1560: RHACM4K-1560 resolves pre/post ansible subscription scenario', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-1560', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_ansible_1560');
    expect(resolved.subscription.applicationName).toBe('auto-git-ansible');
    expect(resolved.subscription.namespace).toBe('auto-git-ansible-ns');
    expect(resolved.subscription.repositories?.[0]).toMatchObject({
      kind: 'git',
      path: 'ansible',
      branch: 'main',
    });
    expect(resolved.subscription.perBlock?.[0]?.automation?.existingAnsibleSecret).toBe(
      'ansible-pre-post-1560'
    );
    expect(resolved.applicationExpectations?.successMinResourceCount).toBe(4);
    expect(resolved.applicationExpectations?.topologySubscriptionHooks).toEqual([
      'prehook',
      'posthook',
    ]);
    expect(resolved.applicationExpectations?.localClusterPlacement).toBe(true);
  });

  test('argo_app_table_helloworld_argo_auto: RHACM4K-6902 / 6903 argo push scenario', () => {
    const resolved = resolveArgoPushScenarioById('argo_app_table_helloworld_argo_auto', E2E_SPEC_DATA_DIR);
    expect(resolved.argoPush.applicationName).toBe('helloworld-argo-app-auto');
    expect(resolved.argoPush.argoServerLabel).toBe('openshift-gitops');
    expect(resolved.argoPush.destinationNamespace).toBe('helloworld-argo-auto-ns');
    expect(resolved.argoPush.git).toMatchObject({
      path: 'helloworld-argo',
      branch: 'main',
    });
    expect(resolved.argoPush.placementLabelExpression).toEqual({
      labelName: 'test',
      labelValues: ['auto'],
    });
  });

  test('argo_appset_owned_app_4043: owned ApplicationSet list scenario', () => {
    const resolved = resolveArgoPushScenarioById('argo_appset_owned_app_4043', E2E_SPEC_DATA_DIR);
    expect(resolved.argoPush.applicationName).toBe('helloworld-argo-app-mc-auto');
    expect(resolved.argoPush.postCreateWaitMs).toBe(180_000);
    expect(resolved.argoPush.placementLabelExpression).toEqual({
      labelName: 'feature.open-cluster-management.io/addon-application-manager',
      labelValues: ['available'],
    });
  });

  test('argo_multisource_git_helm_37185: Git + Helm multi-source scenario', () => {
    const resolved = resolveArgoPushScenarioById('argo_multisource_git_helm_37185', E2E_SPEC_DATA_DIR);
    expect(resolved.argoPush.multiSource).toBe(true);
    expect(resolved.argoPush.helm).toMatchObject({
      chartName: 'helloworld-helm',
      packageVersion: '0.2.0',
    });
  });

  test('argo_empty_placement_40996: empty-placement GitOpsCluster scenario', () => {
    const resolved = resolveArgoPushScenarioById('argo_empty_placement_40996', E2E_SPEC_DATA_DIR);
    expect(resolved.argoPush.argoServerLabel).toBe('empty-placement-cluster');
    expect(resolved.argoPush.applicationSetNamespace).toBe('openshift-gitops');
    expect(resolved.argoPush.setupYamlRelativePath).toBe('src/templates/app/gitops/empty-placement.yaml');
  });

  test('auto_git_multi: RHACM4K-6902 subscription side uses auto-git-multi', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-6902', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_multi');
    expect(resolved.subscription.applicationName).toBe('auto-git-multi');
    expect(resolved.subscription.namespace).toBe('auto-git-multi-ns');
  });

  test('auto_git_multi: RHACM4K-6903 resolves uniquely to auto-git-multi', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-6903', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_multi');
  });

  test('auto_git_placement_topology: helloworld + local placement (RHACM4K-39232)', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    expect(spec.scenarios.auto_git_placement_topology?.blocks?.[0]?.use).toContain('placement_label_local');

    const resolved = resolveSubscriptionScenarioById('auto_git_placement_topology', E2E_SPEC_DATA_DIR);
    const sub = resolved.subscription;

    expect(sub.applicationName).toBe('api-git-local');
    expect(sub.namespace).toBe('api-git-local-ns');
    expect(sub.repositories?.[0]).toMatchObject({ path: 'helloworld', kind: 'git' });
    expect(sub.perBlock?.[0]?.clusterDeployment).toMatchObject({
      clusterSet: 'global',
      labelSelectorRows: [{ labelName: 'name', labelValue: 'local-cluster' }],
    });
  });

  test('auto_git_helloworld_local: single Git block, local placement, expectations for Details/Topology', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    expect(spec.scenarios.auto_git_helloworld_local?.blocks).toHaveLength(1);
    expect(spec.scenarios.auto_git_helloworld_local?.blocks?.[0]?.use).toContain('git_helloworld');
    expect(spec.scenarios.auto_git_helloworld_local?.blocks?.[0]?.use).toContain('placement_label_local');

    const resolved = resolveSubscriptionScenarioById('auto_git_helloworld_local', E2E_SPEC_DATA_DIR);
    const sub = resolved.subscription;

    expect(sub.submit).toBe(true);
    expect(sub.applicationName).toBe('auto-git-helloworld');
    expect(sub.namespace).toBe('auto-git-helloworld-ns');
    expect(sub.repositories).toHaveLength(1);
    expect(sub.repositories?.[0]).toMatchObject({ path: 'helloworld', kind: 'git' });

    const appExp = resolved.applicationExpectations;
    expect(appExp.clusterResourcesFlat.every((r) => r.namespace === 'auto-git-helloworld-ns')).toBe(true);
    expect(appExp.clusterResources).toHaveLength(1);
    expect(appExp.clusterResources[0]).toHaveLength(5);
    expect(appExp.topologyClusterResourceBlocks).toHaveLength(1);
    expect(appExp.topologyClusterResourceBlocks[0]).toEqual(
      appExp.clusterResources[0]!.map(({ kind, name }) => ({ kind, name }))
    );
    expect(appExp.detailsClustersSummary).toEqual({ variant: 'localOnly' });
    expect(appExp.advancedConfiguration?.channelDisplaySubstring).toBe(
      'ggithubcom-stolostron-application-lifecycle-samples'
    );
    expect(appExp.advancedConfiguration?.channelRepositoryUrl).toBe(
      'https://github.com/stolostron/application-lifecycle-samples.git'
    );
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

  test('auto_git_push_helloworld: argoPush domain from fragments + profile + scenario overlay', () => {
    const spec = loadE2eSpecData(E2E_SPEC_DATA_DIR);
    expect(spec.scenarios.auto_git_push_helloworld?.blocks?.[0]?.use).toContain(
      'argo_push_git_helloworld'
    );

    const resolved = resolveArgoPushScenarioById('auto_git_push_helloworld', E2E_SPEC_DATA_DIR);
    expect(resolved.domain).toBe('argoPush');
    expect(resolved.argoPush).toMatchObject({
      applicationName: 'auto-git-push-helloworld',
      argoServerLabel: 'openshift-gitops',
      destinationNamespace: 'auto-git-push-helloworld-ns',
      clusterSet: 'auto-gitops-cluster-set',
      submit: true,
      collapseYamlPanel: true,
      git: {
        url: 'https://github.com/stolostron/application-lifecycle-samples.git',
        branch: 'main',
        path: 'helloworld',
      },
    });
  });

  test('resolveScenarioByTestId resolves argoPush scenario by Polarion id', () => {
    const resolved = resolveScenarioByTestId('RHACM4K-PUSH-GIT-HELLOWORLD', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_push_helloworld');
    expect(resolved.domain).toBe('argoPush');
    if (resolved.domain === 'argoPush') {
      expect(resolved.argoPush.applicationName).toBe('auto-git-push-helloworld');
    }
  });

  test('auto_git_push_review_63807: RHACM4K-63807 review wizard payload', () => {
    const resolved = resolveScenarioByTestId('RHACM4K-63807', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_git_push_review_63807');
    expect(resolved.domain).toBe('argoPush');
    if (resolved.domain === 'argoPush') {
      expect(resolved.argoPush).toMatchObject({
        applicationName: 'auto-git-push-review-63807',
        submit: false,
        collapseYamlPanel: true,
        git: { branch: 'main', path: 'helloworld-argo' },
        placementLabelExpression: { labelName: 'name', labelValues: ['local-cluster'] },
      });
    }
  });

  test('argo_appset_placement_preview_64219: RHACM4K-64219 placement preview payload', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-64219', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_appset_placement_preview_64219');
    expect(resolved.argoPush).toMatchObject({
      pullApplicationName: 'argo-pull-placement-preview',
      applicationName: 'argo-push-placement-preview',
      argoServerLabel: 'openshift-gitops',
      destinationNamespace: 'argo-placement-preview-ns',
      clusterSet: 'auto-gitops-cluster-set',
      existingPlacementName: 'gitops-placement-preview-test',
      setupYamlRelativePath: 'src/templates/app/gitops-placement-preview-setup.yaml',
      submit: false,
      collapseYamlPanel: true,
      git: {
        url: 'https://github.com/stolostron/application-lifecycle-samples.git',
        branch: 'main',
        path: 'helloworld',
      },
    });
  });

  test('argo_row_action_helloworld_auto: RHACM4K-6772 row action scenario', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-6772', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_row_action_helloworld_auto');
    expect(resolved.argoPush.applicationName).toBe('helloworld-argo-app-auto');
    expect(resolved.argoPush.placementLabelExpression).toEqual({
      labelName: 'test',
      labelValues: ['auto'],
    });
  });

  test('argo_push_manual_sync_61942: RHACM4K-61942 manual sync scenario', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-61942', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_push_manual_sync_61942');
    expect(resolved.argoPush.applicationName).toBe('push-model-manual-sync');
    expect(resolved.argoPush.disableAutomatedSync).toBe(true);
  });

  test('argo_wizard_edit_xj: RHACM4K-6735 wizard edit scenario', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-6735', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_wizard_edit_xj');
    expect(resolved.argoPush.applicationName).toBe('xj-argoset1');
  });

  test('argo_long_lived_secret: RHACM4K-54897 long-lived secret scenario', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-54897', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_long_lived_secret');
    expect(resolved.argoPush.git?.path).toBe('helloworld-argo');
    expect(resolved.argoPush.postCreateWaitMs).toBe(180_000);
  });

  test('argo_pull_topology_38202: RHACM4K-38202 pull topology scenario', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-38202', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_pull_topology_38202');
    expect(resolved.argoPush.applicationName).toBe('auto-git-pm-topology');
    expect(resolved.argoPush.git?.path).toBe('mortgage');
    expect(resolved.argoPush.successNumber).toBe(3);
  });

  test('argo_pull_git_wizard_42703: RHACM4K-42703 git pull wizard scenario', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-42703', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_pull_git_wizard_42703');
    expect(resolved.argoPush.applicationName).toBe('auto-git-pm-wizard');
    expect(resolved.argoPush.git?.path).toBe('mortgage-pm-argo');
    expect(resolved.argoPush.placementLabelExpression).toBeUndefined();
  });

  test('argo_pull_helm_wizard_42705: RHACM4K-42705 helm pull wizard scenario', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-42705', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_pull_helm_wizard_42705');
    expect(resolved.argoPush.applicationName).toBe('auto-helm-pm-wizard');
    expect(resolved.argoPush.helm).toEqual({
      url: 'https://raw.githubusercontent.com/stolostron/application-lifecycle-samples/main',
      chartName: 'mortgage-helm',
      packageVersion: '0.1.0',
    });
    expect(resolved.argoPush.git?.path).toBeUndefined();
  });

  test('argo_pull_manual_sync_60049: RHACM4K-60049 pull manual sync scenario', () => {
    const resolved = resolveArgoPushScenarioByTestId('RHACM4K-60049', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('argo_pull_manual_sync_60049');
    expect(resolved.argoPush.applicationName).toBe('test-appset-pm-sync');
    expect(resolved.argoPush.destinationNamespace).toBe('test-appset-pm-sync-ns');
  });

  test('flux_git_local_16762: RHACM4K-16762 Flux git local scenario', () => {
    const resolved = resolveFluxScenarioByTestId('RHACM4K-16762', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('flux_git_local_16762');
    expect(resolved.domain).toBe('flux');
    expect(resolved.flux).toMatchObject({
      kind: 'git',
      applicationName: 'auto-flux-git-local',
      namespace: 'auto-flux-git-local-ns',
      clusterName: 'local-cluster',
      deployment: 'helloworld-app-deploy',
      git: { path: 'helloworld' },
      topologyIcons: ['route', 'service', 'replicaset', 'other'],
    });
  });

  test('flux_helm_local_16763: RHACM4K-16763 Flux helm local scenario', () => {
    const resolved = resolveFluxScenarioByTestId('RHACM4K-16763', E2E_SPEC_DATA_DIR);
    expect(resolved.flux.kind).toBe('helm');
    expect(resolved.flux.helm).toEqual({
      chartName: 'helloworld-helm',
      packageVersion: '0.2.0',
    });
  });

  test('flux_git_edit: RHACM4K-16764 edit pair resolves base + mortgage delta', () => {
    const { base, delta } = resolveFluxScenarioPair({
      baseScenarioId: 'flux_git_edit_local_initial',
      testId: 'RHACM4K-16764',
      configPath: E2E_SPEC_DATA_DIR,
    });
    expect(base.flux.git?.path).toBe('helloworld');
    expect(delta.flux.git?.path).toBe('mortgage');
    expect(delta.flux.deployment).toBe('mortgage-app-deploy');
  });

  test('flux_git_edit_local_initial: resolves by scenario id without Polarion test', () => {
    const resolved = resolveFluxScenarioById('flux_git_edit_local_initial', E2E_SPEC_DATA_DIR);
    expect(resolved.domain).toBe('flux');
    expect(resolved.flux.applicationName).toBe('auto-flux-git-edit-local');
  });

  test('flux_git_managed_16783: RHACM4K-16783 Flux git managed scenario', () => {
    const resolved = resolveFluxScenarioByTestId('RHACM4K-16783', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('flux_git_managed_16783');
    expect(resolved.flux).toMatchObject({
      kind: 'git',
      applicationName: 'auto-flux-git-managed',
      namespace: 'auto-flux-git-managed-ns',
      deployment: 'helloworld-app-deploy',
      git: { path: 'helloworld' },
    });
    expect(resolved.flux.clusterName).toBeUndefined();
  });

  test('flux_git_edit_managed: RHACM4K-16785 edit pair resolves base + mortgage delta', () => {
    const { base, delta } = resolveFluxScenarioPair({
      baseScenarioId: 'flux_git_edit_managed_initial',
      testId: 'RHACM4K-16785',
      configPath: E2E_SPEC_DATA_DIR,
    });
    expect(base.flux.applicationName).toBe('auto-flux-git-edit-managed');
    expect(base.flux.git?.path).toBe('helloworld');
    expect(delta.flux.git?.path).toBe('mortgage');
    expect(delta.flux.deployment).toBe('mortgage-app-deploy');
  });

  test('flux_helm_del_managed_16788: RHACM4K-16788 Flux helm delete managed scenario', () => {
    const resolved = resolveFluxScenarioByTestId('RHACM4K-16788', E2E_SPEC_DATA_DIR);
    expect(resolved.flux.applicationName).toBe('auto-flux-helm-del-managed');
    expect(resolved.flux.namespace).toBe('auto-flux-helm-del-managed-ns');
  });

  test('auto_helm_helloworld_managed: RHACM4K-7486 helm managed scenario', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-7486', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_helm_helloworld_managed');
    expect(resolved.subscription.applicationName).toBe('auto-helm-helloworld');
    expect(resolved.subscription.repositories[0]).toMatchObject({
      kind: 'helm',
      chartName: 'helloworld-helm',
      packageVersion: '3.0.0-stable',
    });
    expect(resolved.applicationExpectations.detailsClustersSummary).toEqual({
      variant: 'remoteOnly',
      remoteCount: 1,
    });
  });

  test('auto_helm_multi: RHACM4K-7560 multi-subscription helm scenario', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-7560', E2E_SPEC_DATA_DIR);
    expect(resolved.subscription.repositories).toHaveLength(2);
    expect(resolved.applicationExpectations.successMinResourceCount).toBe(3);
  });

  test('auto_helm_multi_restore: RHACM4K-45791 restore scenario uses isolated app name', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-45791', E2E_SPEC_DATA_DIR);
    expect(resolved.subscription.applicationName).toBe('auto-helm-multi-restore');
    expect(resolved.subscription.namespace).toBe('auto-helm-multi-restore-ns');
  });

  test('auto_obj_minio_mortgage: RHACM4K-7485 object storage online placement scenario', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-7485', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('auto_obj_minio_mortgage');
    expect(resolved.subscription.applicationName).toBe('auto-obj-minio-mortgage');
    expect(resolved.subscription.repositories[0]).toMatchObject({
      kind: 'objectStorage',
      subfolder: 'mortgage',
    });
    expect(resolved.subscription.repositories).toHaveLength(1);
  });

  test('auto_obj_multi: RHACM4K-7814 multi-subscription object storage scenario', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-7814', E2E_SPEC_DATA_DIR);
    expect(resolved.subscription.repositories).toHaveLength(2);
    expect(resolved.subscription.repositories[0]).toMatchObject({
      kind: 'objectStorage',
      subfolder: 'helloworld',
    });
    expect(resolved.applicationExpectations.successMinResourceCount).toBe(5);
  });

  test('auto_obj_add_subscription: RHACM4K-7812 add subscription reuses auto-obj-multi app', () => {
    const resolved = resolveSubscriptionScenarioByTestId('RHACM4K-7812', E2E_SPEC_DATA_DIR);
    expect(resolved.subscription.applicationName).toBe('auto-obj-multi');
    expect(resolved.subscription.repositories[0]).toMatchObject({
      kind: 'objectStorage',
      subfolder: 'helloworld',
    });
  });

  test('ocp_helloworld_local: RHACM4K-16793 OpenShift local cluster scenario', () => {
    const resolved = resolveOpenshiftScenarioByTestId('RHACM4K-16793', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('ocp_helloworld_local');
    expect(resolved.openshift.applicationName).toBe('helloworld-app-ocp');
    expect(resolved.openshift.clusterName).toBe('local-cluster');
    expect(resolved.openshift.topologyIcons).toEqual(['route', 'service', 'replicaset']);
  });

  test('ocp_mortgage_edit_local: RHACM4K-16794 mortgage part-of edit scenario', () => {
    const resolved = resolveOpenshiftScenarioByTestId('RHACM4K-16794', E2E_SPEC_DATA_DIR);
    expect(resolved.openshift.nameEdit).toBe('mortgage-app-ocp');
    expect(resolved.openshift.deployment).toBe('mortgage-app-ocp');
    expect(resolved.openshift.successNumber).toBe(7);
  });

  test('ocp_helloworld_managed: RHACM4K-16796 managed cluster scenario omits clusterName', () => {
    const resolved = resolveOpenshiftScenarioByTestId('RHACM4K-16796', E2E_SPEC_DATA_DIR);
    expect(resolved.openshift.clusterName).toBeUndefined();
  });

  test('namespace_length_git_base: RHACM4K-6883 git example-k8s-app scenario', () => {
    const resolved = resolveSubscriptionScenarioById('namespace_length_git_base', E2E_SPEC_DATA_DIR);
    expect(resolved.subscription.repositories[0]).toMatchObject({
      kind: 'git',
      path: 'example-k8s-app',
      branch: 'main',
    });
    expect(resolved.applicationExpectations.clusterResources[0]!.some((r) => r.namespace === 'lars-sandbox')).toBe(
      true
    );
  });

  test('governance placement-preview.yaml: RHACM4K-64221 policy scenario', () => {
    const resolved = resolvePolicyScenarioByTestId('RHACM4K-64221', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('policy_placement_preview_64221');
    expect(resolved.policy).toMatchObject({
      setupYamlRelativePath: 'src/templates/governance/policy-preview-test-setup.yaml',
      namespace: 'policy-preview-test-ns',
      clusterSet: 'policy-test-cluster-set',
      namePrefix: 'policy-placement-preview',
      existingPlacementName: 'policy-preview-test-placement',
    });
  });

  test('governance placement-preview.yaml: RHACM4K-64222 policy set scenario', () => {
    const resolved = resolvePolicySetScenarioByTestId('RHACM4K-64222', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('policy_set_placement_preview_64222');
    expect(resolved.policySet).toMatchObject({
      setupYamlRelativePath: 'src/templates/governance/policy-set-preview-test-setup.yaml',
      namespace: 'policyset-preview-test-ns',
      clusterSet: 'policyset-test-cluster-set',
      namePrefix: 'policyset-placement-preview',
      existingPlacementName: 'policyset-existing-placement-test',
    });
  });

  test('cluster placement-preview.yaml: RHACM4K-64220 placement scenario', () => {
    const resolved = resolvePlacementScenarioByTestId('RHACM4K-64220', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('placement_create_preview_64220');
    expect(resolved.placement).toMatchObject({
      setupYamlRelativePath: 'src/templates/cluster/placement-preview-test-setup.yaml',
      namespace: 'preview-test-ns',
      clusterSet: 'preview-test-cluster-set',
      namePrefix: 'placement-preview',
    });
  });

  test('applications ansible-scale.yaml: RHACM4K-42375 prehook scenario', () => {
    const resolved = resolveAnsibleScaleScenarioByTestId('RHACM4K-42375', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('ansible_scale_1_prehook_42375');
    expect(resolved.ansibleScale).toMatchObject({
      namespace: 'ansible-scale-1-prehook',
      applicationName: 'ansible-scale-1-prehook',
      firstJobSubstring: 'ztp-day2-automation-1',
      syncTiming: 'beforePatch',
      jobCountBeforePatch: 1,
      jobCountAfterPatch: 2,
      pollTimeoutMs: 300_000,
    });
  });

  test('applications ansible-scale.yaml: RHACM4K-42376 posthook scenario', () => {
    const resolved = resolveAnsibleScaleScenarioByTestId('RHACM4K-42376', E2E_SPEC_DATA_DIR);
    expect(resolved.scenarioId).toBe('ansible_scale_1_posthook_42376');
    expect(resolved.ansibleScale).toMatchObject({
      namespace: 'ansible-scale-1-posthook',
      applicationName: 'ansible-scale-1-posthook',
      firstJobSubstring: 'posthook',
      syncTiming: 'afterPatch',
      afterPatchPollTimeoutMs: 500_000,
      managedClusterVerify: {
        resource: 'configmap',
        expectedSubstring: 'guestbook-cfgmap',
      },
    });
  });

  test('applications ansible-scale.yaml: suite prep profile', () => {
    const suite = resolveAnsibleScaleSuiteConfig(E2E_SPEC_DATA_DIR);
    expect(suite).toMatchObject({
      fakeSecretYamlRelativePath: 'src/templates/app/ansible-scale/ansible-fake-secret.yaml',
      ansibleJobCrdYamlRelativePath: 'src/templates/app/ansible-scale/ansiblejob.crd.yaml',
      clusterNamePlaceholder: '{CLUSTER_NAME}',
    });
  });
});
