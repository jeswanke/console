/** Git ALC Playwright suite. Polarion ids in file tags; helpers in `@lib/app/verify`. */
import {
  clearE2eSpecDataCache,
  resolveSubscriptionScenarioByTestId,
  resolveSubscriptionScenarioPair,
} from '@config';
import { GIT_COMMIT_HASH_TEST7513, GIT_PLACEMENTRULE_NO_NAME_TEST } from '@constants/app';
import { applyGitPlacementRuleNoNameFixture } from '@lib/app/setup/git-placementrule-no-placementref-name';
import {
  addSubscriptionToExistingApplication,
  buildGlobalClusterLabelDeployment,
  createSubscription,
  deleteSubscriptionFromExistingApplication,
  editSubscriptionBrokenPlacementRuleRef,
  editSubscriptionInExistingApplication,
  syncSubscriptionApplication,
} from '@lib/app/subscription';
import {
  localClusterPlacementDrawerExpectation,
  managedClusterOnlyPlacementDrawerExpectation,
} from '@lib/app/topology/placement-drawer-expectations';
import {
  expectOrphanedAlcResourcesAfterApplicationDeleteViaOc,
  expectSubscriptionAppResourcesViaOc,
} from '@lib/app/verify/resources-oc';
import {
  applyPrivateGitAuthToSubscriptionOptions,
  skipUnlessPrivateGitAuthConfigured,
} from '@lib/app/auth/private-git';
import { resolvePlacementCrNameForSubscriptionBlock } from '@lib/app/placement/resolve';
import {
  buildTopologyNodeDataIdsForSubscriptionBlock,
  defaultSubscriptionCrName,
} from '@lib/app/topology/graph-ids';
import { skipUnlessPrimaryManagedCluster } from '@lib/cluster/managedClusterContext';
import {
  expectApplicationDetailsMinSuccessResourceCount,
  subscriptionDetailsClusterResourceTotalPattern,
  verifySubscriptionAppDetailsTab,
} from '@lib/app/verify/details-tab';
import {
  verifyCrdGitApplicationTopologyStatus,
  verifyPlacementDecisionTopologyDrawer,
  verifySubscriptionAppTopologyTab,
  verifyTopologyGraphNodesSuccessStatus,
} from '@lib/app/verify/topology-tab';
import { expect, test } from '@fixtures/app-test';

/** Polarion-aligned tags for `--grep` in CI. */
test.describe('Git Applications', {
  tag: ['@git', '@fresh-install', '@placement', '@git-apps', '@alc', '@app'],
}, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    clearE2eSpecDataCache();
  });

  test(
    'RHACM4K-7484: ALC: Create a Git Application deployed on a Local Cluster',
    {
      tag: [
        '@e2e-common',
        '@RHACM4K-7484',
        '@create',
        '@post-release',
        '@ocpInterop',
        '@pre-upgrade',
        '@post-upgrade',
      ],
    },
    async ({
    page,
    oc,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(180_000);
    const { subscription: options, applicationExpectations: expectations } =
      resolveSubscriptionScenarioByTestId('RHACM4K-7484');

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

    const { applicationName, namespace } = options;
    const clusterResourceRows = expectations.topologyClusterResourceBlocks[0]!;

    await expectSubscriptionAppResourcesViaOc({
      oc,
      applicationName,
      namespace,
      applicationExpectations: expectations,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      applicationExpectations: expectations,
      repositories: options.repositories,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      blockIndex: 1,
      clusterResourceRows,
    });

    // List toolbar: search by name, Type filter, then clear search.
    await applicationListPage.expectApplicationDiscoverableViaSearchAndTypeFilter(applicationName);

    await applicationListPage.expectAdvancedConfigShowsSubscriptionAndChannelForBlock({
      applicationName,
      applicationExpectations: expectations,
      blockIndex: 1,
    });
  });

  test(
    'RHACM4K-1071: ALC: Create a private git application and its resources via application wizard',
    { tag: ['@e2e-common', '@RHACM4K-1071', '@create'] },
    async ({
    page,
    oc,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(300_000);
    const auth = skipUnlessPrivateGitAuthConfigured(test, 'RHACM4K-1071');
    if (!auth) return;

    const { subscription: baseOptions, applicationExpectations: expectations } =
      resolveSubscriptionScenarioByTestId('RHACM4K-1071');
    const options = applyPrivateGitAuthToSubscriptionOptions(baseOptions, auth);
    const { applicationName, namespace } = options;
    const clusterResourceRows = expectations.topologyClusterResourceBlocks[0]!;

    await oc.deleteNamespace(namespace);
    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

    await expectSubscriptionAppResourcesViaOc({
      oc,
      applicationName,
      namespace,
      applicationExpectations: expectations,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      applicationExpectations: expectations,
      repositories: options.repositories,
      detailsValuesTimeout: 180_000,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      blockIndex: 1,
      clusterResourceRows,
    });

    await applicationListPage.goto();
    await applicationListPage.expectApplicationDiscoverableViaSearchAndTypeFilter(applicationName);

    await applicationListPage.expectAdvancedConfigShowsSubscriptionAndChannelForBlock({
      applicationName,
      applicationExpectations: expectations,
      blockIndex: 1,
    });

    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName,
      namespace,
      removeRelatedResources: true,
    });
  });

  test(
    'RHACM4K-7556: ALC: Create a Git Application with Multiple Subscriptions',
    { tag: ['@e2e-common', '@RHACM4K-7556', '@create', '@ocpInterop', '@post-upgrade'] },
    async ({
    page,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(300_000);
    const { subscription: options, applicationExpectations: expectations } =
      resolveSubscriptionScenarioByTestId('RHACM4K-7556');
    expect(options.submit).toBe(true);
    expect(options.repositories).toHaveLength(2);

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

    const { applicationName, namespace } = options;
    const mergedSubscriptionBlocks = [
      { blockIndex: 1, clusterResourceRows: expectations.topologyClusterResourceBlocks[0]! },
      { blockIndex: 2, clusterResourceRows: expectations.topologyClusterResourceBlocks[1]! },
    ];
    const crsSub1 = subscriptionDetailsClusterResourceTotalPattern(expectations.clusterResources[0]!.length);
    const crsSub2 = subscriptionDetailsClusterResourceTotalPattern(expectations.clusterResources[1]!.length);
    const crsAll = subscriptionDetailsClusterResourceTotalPattern(
      expectations.clusterResources[0]!.length + expectations.clusterResources[1]!.length
    );

    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      applicationExpectations: expectations,
      repositories: options.repositories,
      clusterResourceStatusPattern: crsSub1,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      mergedSubscriptionBlocks,
      subscriptionScope: 'initial',
      topologyMergeBlockIndices: [1],
    });

    await applicationDetailsPage.chooseTopologySubscriptionScopeByCrName(
      defaultSubscriptionCrName(applicationName, 2)
    );

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      applicationExpectations: expectations,
      repositories: options.repositories,
      clusterResourceStatusPattern: crsSub2,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      mergedSubscriptionBlocks,
      subscriptionScope: { subscriptionCrName: defaultSubscriptionCrName(applicationName, 2) },
      topologyMergeBlockIndices: [2],
    });

    await applicationDetailsPage.chooseTopologySubscriptionScopeAll();

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      applicationExpectations: expectations,
      repositories: options.repositories,
      clusterResourceStatusPattern: crsAll,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      mergedSubscriptionBlocks,
      subscriptionScope: 'all',
    });
  });

  test(
    'RHACM4K-7554: ALC: Add A Git Subscription to An Existing Git Application',
    { tag: ['@e2e-common', '@RHACM4K-7554', '@edit', '@post-upgrade'] },
    async ({
    page,
    oc,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(240_000);
    const { base, delta } = resolveSubscriptionScenarioPair({
      baseScenarioId: 'auto_git_add_subscription_base',
      testId: 'RHACM4K-7554',
    });
    const baseOptions = base.subscription;
    const baseExpectations = base.applicationExpectations;
    const addOptions = delta.subscription;
    const addExpectations = delta.applicationExpectations;
    expect(addOptions.repositories).toHaveLength(1);

    await oc.deleteNamespace(baseOptions.namespace);
    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, baseOptions);
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: baseOptions.applicationName,
      namespace: baseOptions.namespace,
      applicationExpectations: baseExpectations,
      repositories: baseOptions.repositories,
      detailsValuesTimeout: 60_000,
    });
    await addSubscriptionToExistingApplication(
      applicationListPage,
      subscriptionApplicationCreateWizardPage,
      {
        ...addOptions,
        entry: 'details',
      }
    );

    await applicationDetailsPage.navigateToApplicationTab(
      addOptions.namespace,
      addOptions.applicationName,
      'details'
    );
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: addOptions.applicationName,
      namespace: addOptions.namespace,
      applicationExpectations: baseExpectations,
      repositories: [...baseOptions.repositories, ...addOptions.repositories],
      detailsValuesTimeout: 180_000,
    });

    await applicationDetailsPage.navigateToApplicationTab(
      addOptions.namespace,
      addOptions.applicationName,
      'topology'
    );
    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: addOptions.applicationName,
      namespace: addOptions.namespace,
      subscriptionScope: 'all',
      mergedSubscriptionBlocks: [
        { blockIndex: 1, clusterResourceRows: baseExpectations.topologyClusterResourceBlocks[0]! },
        { blockIndex: 2, clusterResourceRows: addExpectations.topologyClusterResourceBlocks[0]! },
      ],
    });
  });

  test(
    'RHACM4K-1427: ALC: Edit an existing Git application',
    { tag: ['@e2e-common', '@RHACM4K-1427', '@edit'] },
    async ({
    page,
    oc,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(300_000);
    const { base, delta } = resolveSubscriptionScenarioPair({
      baseScenarioId: 'auto_git_mortgage_edit_base',
      testId: 'RHACM4K-1427',
    });
    const baseOptions = base.subscription;
    const baseExpectations = base.applicationExpectations;
    const editOptions = delta.subscription;
    const editExpectations = delta.applicationExpectations;
    expect(editOptions.repositories).toHaveLength(1);

    await oc.deleteNamespace(baseOptions.namespace);
    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, baseOptions);
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: baseOptions.applicationName,
      namespace: baseOptions.namespace,
      applicationExpectations: baseExpectations,
      repositories: baseOptions.repositories,
      detailsValuesTimeout: 60_000,
    });

    await editSubscriptionInExistingApplication(
      applicationListPage,
      subscriptionApplicationCreateWizardPage,
      {
        ...editOptions,
        entry: 'details',
      }
    );

    await applicationDetailsPage.navigateToApplicationTab(
      editOptions.namespace,
      editOptions.applicationName,
      'details'
    );
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: editOptions.applicationName,
      namespace: editOptions.namespace,
      applicationExpectations: editExpectations,
      repositories: editOptions.repositories,
      detailsValuesTimeout: 180_000,
    });

    await syncSubscriptionApplication({
      detailsPage: applicationDetailsPage,
      timeout: 60_000,
    });

    await applicationListPage.goto();
    await applicationListPage.expectAdvancedConfigShowsSubscriptionAndChannelForBlock({
      applicationName: editOptions.applicationName,
      applicationExpectations: editExpectations,
      blockIndex: 1,
    });

    await expectSubscriptionAppResourcesViaOc({
      oc,
      applicationName: editOptions.applicationName,
      namespace: editOptions.namespace,
      applicationExpectations: editExpectations,
    });

    await applicationListPage.goto();
    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName: editOptions.applicationName,
      namespace: editOptions.namespace,
      removeRelatedResources: true,
    });
  });

  test(
    'RHACM4K-7555: ALC: Delete A Git Subscription from an Existing Multi-Subscription Git Application',
    { tag: ['@e2e-common', '@RHACM4K-7555', '@edit', '@post-upgrade'] },
    async ({
    page,
    oc,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(240_000);
    const { subscription: options, applicationExpectations: expectations } =
      resolveSubscriptionScenarioByTestId('RHACM4K-7555');
    expect(options.repositories).toHaveLength(2);

    await oc.deleteNamespace(options.namespace);
    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: options.applicationName,
      namespace: options.namespace,
      applicationExpectations: expectations,
      repositories: options.repositories,
      detailsValuesTimeout: 60_000,
    });
    await deleteSubscriptionFromExistingApplication(
      applicationListPage,
      subscriptionApplicationCreateWizardPage,
      {
        applicationName: options.applicationName,
        namespace: options.namespace,
        entry: 'details',
        deleteBlockIndex: 1,
      }
    );

    await applicationDetailsPage.navigateToApplicationTab(options.namespace, options.applicationName, 'details');
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: options.applicationName,
      namespace: options.namespace,
      applicationExpectations: expectations,
      repositories: [options.repositories[0]!],
    });

    await applicationDetailsPage.navigateToApplicationTab(options.namespace, options.applicationName, 'topology');
    await verifySubscriptionAppTopologyTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName: options.applicationName,
      namespace: options.namespace,
      blockIndex: 1,
      clusterResourceRows: expectations.topologyClusterResourceBlocks[0]!,
    });
  });

  test(
    'RHACM4K-7557: ALC: Delete a Git Application with Multiple Subscriptions',
    { tag: ['@e2e-common', '@RHACM4K-7557', '@destroy', '@ocpInterop', '@post-upgrade'] },
    async ({
    applicationListPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(240_000);
    const { subscription: options } = resolveSubscriptionScenarioByTestId('RHACM4K-7557');
    expect(options.repositories).toHaveLength(2);

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName: options.applicationName,
      namespace: options.namespace,
      removeRelatedResources: true,
    });
  });

  test(
    'RHACM4K-39232: ALC: Display more placement info for the topology node details tab',
    { tag: ['@e2e-common', '@RHACM4K-39232', '@create'] },
    async ({
    page,
    oc,
    managedClusterContext,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(480_000);
    const managedCluster = skipUnlessPrimaryManagedCluster(test, managedClusterContext, 'RHACM4K-39232');
    if (!managedCluster) return;

    const { subscription: options } = resolveSubscriptionScenarioByTestId('RHACM4K-39232');
    const { applicationName, namespace } = options;

    await oc.deleteNamespace(namespace);
    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);
    await oc.ensureManagedClusterSetBinding(namespace, 'global');

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifyPlacementDecisionTopologyDrawer({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      oc,
      expectation: localClusterPlacementDrawerExpectation(),
    });

    await editSubscriptionInExistingApplication(
      applicationListPage,
      subscriptionApplicationCreateWizardPage,
      {
        ...options,
        entry: 'details',
        perBlock: [{ clusterDeployment: buildGlobalClusterLabelDeployment(managedCluster.name) }],
      }
    );

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
    await syncSubscriptionApplication({
      detailsPage: applicationDetailsPage,
      timeout: 120_000,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifyPlacementDecisionTopologyDrawer({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      oc,
      expectation: managedClusterOnlyPlacementDrawerExpectation(managedCluster.name),
    });

    await applicationListPage.goto();
    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName,
      namespace,
      removeRelatedResources: true,
    });
  });

  test(
    'RHACM4K-41356: ALC: Verify each topology node has correct status',
    { tag: ['@e2e-common', '@RHACM4K-41356', '@create'] },
    async ({
      page,
      oc,
      applicationListPage,
      applicationDetailsPage,
      subscriptionApplicationCreateWizardPage,
    }) => {
      test.setTimeout(300_000);
      const { subscription: options, applicationExpectations: expectations } =
        resolveSubscriptionScenarioByTestId('RHACM4K-41356');

      await oc.deleteNamespace(options.namespace);
      await applicationListPage.goto();
      await createSubscription(
        applicationListPage,
        subscriptionApplicationCreateWizardPage,
        options
      );
      await oc.ensureManagedClusterSetBinding(options.namespace, 'global');

      await expectSubscriptionAppResourcesViaOc({
        oc,
        applicationName: options.applicationName,
        namespace: options.namespace,
        applicationExpectations: expectations,
      });

      const { applicationName, namespace } = options;
      const clusterResourceRows = expectations.topologyClusterResourceBlocks[0]!;
      await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
      await verifySubscriptionAppTopologyTab({
        page,
        detailsPage: applicationDetailsPage,
        applicationName,
        namespace,
        blockIndex: 1,
        clusterResourceRows,
        drawerSpotChecks: [],
        assertGraphNodesSuccessStatus: true,
      });

      await applicationListPage.goto();
      await applicationListPage.deleteApplicationFromOverviewViaSearch({
        applicationName,
        namespace,
        removeRelatedResources: true,
      });
    }
  );

  test(
    'RHACM4K-7513: ALC: Update Git application to use a different commit hash Test',
    { tag: ['@e2e-common', '@RHACM4K-7513', '@edit'] },
    async ({
      oc,
      applicationListPage,
      applicationDetailsPage,
      subscriptionApplicationCreateWizardPage,
    }) => {
      test.setTimeout(420_000);
      const { subscription: options } = resolveSubscriptionScenarioByTestId('RHACM4K-7513');
      const { applicationName, namespace } = options;
      const baseRepo = options.repositories![0]!;
      if (baseRepo.kind !== 'git') {
        throw new Error('RHACM4K-7513: ALC: expected a single Git repository block');
      }

      await oc.deleteNamespace(namespace);
      await applicationListPage.goto();
      await createSubscription(
        applicationListPage,
        subscriptionApplicationCreateWizardPage,
        options
      );
      await oc.ensureManagedClusterSetBinding(namespace, 'global');

      await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
      await expectApplicationDetailsMinSuccessResourceCount(applicationDetailsPage, 2);

      const subscriptionCrName = defaultSubscriptionCrName(applicationName, 1);
      const gitDesiredCommitKey = 'apps.open-cluster-management.io/git-desired-commit';

      await editSubscriptionInExistingApplication(
        applicationListPage,
        subscriptionApplicationCreateWizardPage,
        {
          applicationName,
          namespace,
          repositories: [{ ...baseRepo, desiredCommit: GIT_COMMIT_HASH_TEST7513.broken }],
          entry: 'details',
        }
      );
      await expect
        .poll(
          () => oc.getSubscriptionAnnotation(namespace, subscriptionCrName, gitDesiredCommitKey),
          { timeout: 60_000, intervals: [2_000, 5_000] }
        )
        .toBe(GIT_COMMIT_HASH_TEST7513.broken);

      await editSubscriptionInExistingApplication(
        applicationListPage,
        subscriptionApplicationCreateWizardPage,
        {
          applicationName,
          namespace,
          repositories: [{ ...baseRepo, desiredCommit: GIT_COMMIT_HASH_TEST7513.fixed }],
          entry: 'details',
        }
      );
      await expect
        .poll(
          () => oc.getSubscriptionAnnotation(namespace, subscriptionCrName, gitDesiredCommitKey),
          { timeout: 60_000, intervals: [2_000, 5_000] }
        )
        .toBe(GIT_COMMIT_HASH_TEST7513.fixed);

      await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
      await syncSubscriptionApplication({
        detailsPage: applicationDetailsPage,
        timeout: 120_000,
      });
      await expectApplicationDetailsMinSuccessResourceCount(applicationDetailsPage, 1, {
        timeout: 300_000,
      });

      await applicationListPage.goto();
      await applicationListPage.deleteApplicationFromOverviewViaSearch({
        applicationName,
        namespace,
        removeRelatedResources: true,
      });
    }
  );

  test(
    'RHACM4K-49630: ALC: Enable to deploy and edit an appsub with no placementrule name in subscription and edit without error',
    { tag: ['@e2e-common', '@RHACM4K-49630', '@edit'] },
    async ({
      page,
      oc,
      applicationListPage,
      applicationDetailsPage,
      subscriptionApplicationCreateWizardPage,
    }) => {
      test.setTimeout(300_000);
      const { applicationName, namespace, placementRuleName } = GIT_PLACEMENTRULE_NO_NAME_TEST;
      const { applicationExpectations } = resolveSubscriptionScenarioByTestId('RHACM4K-41356');
      const clusterResourceRows = applicationExpectations.clusterResources[0]!;

      await applyGitPlacementRuleNoNameFixture(oc);
      await applicationListPage.goto();

      await editSubscriptionBrokenPlacementRuleRef(
        applicationListPage,
        subscriptionApplicationCreateWizardPage,
        { applicationName, namespace, placementRuleName, entry: 'list' }
      );

      const subscriptionCrName = defaultSubscriptionCrName(applicationName, 1);
      await expect
        .poll(
          () => oc.getSubscriptionPlacementRefName(namespace, subscriptionCrName),
          { timeout: 60_000, intervals: [2_000, 5_000] }
        )
        .toBe(placementRuleName);

      await oc.ensureManagedClusterSetBinding(namespace, 'global');

      await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
      await syncSubscriptionApplication({
        detailsPage: applicationDetailsPage,
        timeout: 120_000,
      });

      const placementCrName = await resolvePlacementCrNameForSubscriptionBlock(
        oc,
        namespace,
        applicationName,
        1
      );

      await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
      await verifySubscriptionAppTopologyTab({
        page,
        detailsPage: applicationDetailsPage,
        applicationName,
        namespace,
        blockIndex: 1,
        clusterResourceRows,
        placementCrName,
        drawerSpotChecks: [],
      });

      const topologyDataIds = buildTopologyNodeDataIdsForSubscriptionBlock({
        applicationName,
        namespace,
        blockIndex: 1,
        clusterResourceRows,
        placementCrName,
      });
      await verifyTopologyGraphNodesSuccessStatus(
        applicationDetailsPage,
        topologyDataIds.slice(0, 4),
        { timeout: 90_000 }
      );

      await applicationListPage.goto();
      await applicationListPage.deleteApplicationFromOverviewViaSearch({
        applicationName,
        namespace,
        removeRelatedResources: true,
      });
    }
  );

  test(
    'RHACM4K-39666: ALC: Create an appsub with repo urls contains underscore',
    { tag: ['@e2e-common', '@RHACM4K-39666', '@create'] },
    async ({
    oc,
    applicationListPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(300_000);
    const { subscription: options, applicationExpectations: expectations } =
      resolveSubscriptionScenarioByTestId('RHACM4K-39666');

    await oc.deleteNamespace(options.namespace);
    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);
    await oc.ensureManagedClusterSetBinding(options.namespace, 'global');

    await expectSubscriptionAppResourcesViaOc({
      oc,
      applicationName: options.applicationName,
      namespace: options.namespace,
      applicationExpectations: expectations,
    });

    await applicationListPage.goto();
    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName: options.applicationName,
      namespace: options.namespace,
      removeRelatedResources: true,
    });
  });

  test(
    'RHACM4K-7487: ALC: Delete a Git Application deployed on a Local Cluster',
    { tag: ['@e2e-common', '@RHACM4K-7487', '@destroy', '@ocpInterop'] },
    async ({
    applicationListPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(240_000);
    const { subscription: options } = resolveSubscriptionScenarioByTestId('RHACM4K-7487');

    await applicationListPage.goto();
    await createSubscription(applicationListPage, subscriptionApplicationCreateWizardPage, options);

    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName: options.applicationName,
      namespace: options.namespace,
      removeRelatedResources: true,
    });
  });

  test(
    'RHACM4K-10668: ALC: Deploying CRD via Application should update status in ACM console',
    { tag: ['@e2e-common', '@RHACM4K-10668', '@create'] },
    async ({
    page,
    oc,
    managedClusterContext,
    applicationListPage,
    applicationDetailsPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(360_000);
    const managedCluster = skipUnlessPrimaryManagedCluster(test, managedClusterContext, 'RHACM4K-10668');
    if (!managedCluster) return;

    const { subscription: options, applicationExpectations: expectations } =
      resolveSubscriptionScenarioByTestId('RHACM4K-10668');
    const { applicationName, namespace } = options;

    if (!(await oc.applicationsAppK8sIoExists(namespace, applicationName))) {
      await oc.deleteNamespace(namespace);
    }

    await applicationListPage.goto();
    await createSubscription(
      applicationListPage,
      subscriptionApplicationCreateWizardPage,
      options
    );
    await oc.ensureManagedClusterSetBinding(namespace, 'global');

    await expectSubscriptionAppResourcesViaOc({
      oc,
      applicationName,
      namespace,
      applicationExpectations: expectations,
      includeClusterResourceRows: false,
    });

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'details');
    await verifySubscriptionAppDetailsTab({
      page,
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
      applicationExpectations: expectations,
      repositories: options.repositories,
      detailsValuesTimeout: 120_000,
    });
    await expectApplicationDetailsMinSuccessResourceCount(applicationDetailsPage, 2);

    await applicationDetailsPage.navigateToApplicationTab(namespace, applicationName, 'topology');
    await verifyCrdGitApplicationTopologyStatus({
      detailsPage: applicationDetailsPage,
      applicationName,
      namespace,
    });

    await applicationListPage.deleteApplicationFromOverviewViaSearch({
      applicationName,
      namespace,
      removeRelatedResources: true,
    });
  });

  test(
    'RHACM4K-1558: ALC: Delete an existing application without removing its related resources',
    { tag: ['@RHACM4K-1558', '@destroy'] },
    async ({
    oc,
    applicationListPage,
    subscriptionApplicationCreateWizardPage,
  }) => {
    test.setTimeout(300_000);
    const { subscription: options, applicationExpectations: expectations } =
      resolveSubscriptionScenarioByTestId('RHACM4K-1558');
    const { applicationName, namespace } = options;
    expect(options.repositories).toHaveLength(2);

    try {
      if (!(await oc.applicationsAppK8sIoExists(namespace, applicationName))) {
        await oc.deleteNamespace(namespace);
      }

      await applicationListPage.goto();
      await createSubscription(
        applicationListPage,
        subscriptionApplicationCreateWizardPage,
        options
      );
      await oc.ensureManagedClusterSetBinding(namespace, 'global');

      await applicationListPage.deleteApplicationFromOverviewViaSearch({
        applicationName,
        namespace,
        removeRelatedResources: false,
        deleteNamespaceAfterUiDelete: false,
      });

      await applicationListPage.expectAdvancedConfigRelatedResourcesPersistAfterApplicationDelete({
        applicationName,
        applicationExpectations: expectations,
        blockCount: options.repositories!.length,
      });

      await expectOrphanedAlcResourcesAfterApplicationDeleteViaOc({
        oc,
        applicationName,
        namespace,
        subscriptionBlockIndices: [1, 2],
        placementBlockIndices: [1],
      });
    } finally {
      await oc.deleteNamespace(namespace);
    }
  });
});
