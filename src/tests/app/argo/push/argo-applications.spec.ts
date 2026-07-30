/**
 * RHACM4K-4043, 37185–37193, 40996, 42704, 59973 — Argo ApplicationSet UI suite.
 *
 * Cypress: `Argo_Application_Test_Suite.cy.js` (@UI cases only).
 */
import { clearE2eSpecDataCache, resolveArgoPushScenarioById } from '@config';
import {
  addApplicationSetSourceFromWizard,
  cleanupArgoPushApplication,
  createArgoPushApplication,
  createArgoPushApplicationIfMissing,
  deleteApplicationSetFromList,
  deleteApplicationSetSourceFromWizard,
  setupEmptyPlacementApplicationSet,
  validateApplicationSetSourceRepoUrl,
} from '@lib/app/argo-push';
import { verifyApplicationSetOwnedAppRowsOnList, expectApplicationSetSearchTableRowCount } from '@lib/app/verify/argo-appset-owned-app-list';
import { syncArgoPushApplicationSetFromDetails } from '@lib/app/verify/argo-appset-sync-ui';
import { verifyCompareApplicationTypesPopover } from '@lib/app/verify/compare-application-types';
import { getRepoRoot } from '@lib/repo-root';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Argo Application Test Suite',
  { tag: ['@gitops', '@argo-apps', '@app', '@alc', '@argo'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-4043: ALC: Application owned by applicationSet shows up under the applicationSet name',
      { tag: ['@RHACM4K-4043', '@e2e', '@post-upgrade'] },
      async ({ oc, applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(600_000);

        const { argoPush } = resolveArgoPushScenarioById('argo_appset_owned_app_4043');
        await createArgoPushApplicationIfMissing(
          oc,
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          argoPush
        );
        await verifyApplicationSetOwnedAppRowsOnList(applicationListPage, argoPush.applicationName);
      }
    );

    test(
      'RHACM4K-37185: ALC: Add multiple sources support for ApplicationSet in App UI',
      { tag: ['@RHACM4K-37185', '@e2e', '@applicationset'] },
      async ({ oc, applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(600_000);

        const { argoPush } = resolveArgoPushScenarioById('argo_multisource_git_helm_37185');
        await cleanupArgoPushApplication(oc, argoPush);
        await applicationListPage.goto();
        await createArgoPushApplication(
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          argoPush
        );

        const table = applicationListPage.applicationsTable;
        await applicationListPage.goto();
        await table.search(argoPush.applicationName);
        await expectApplicationSetSearchTableRowCount(applicationListPage);

        await validateApplicationSetSourceRepoUrl(oc, {
          namespace: argoPush.applicationSetNamespace ?? argoPush.argoServerLabel,
          applicationSetName: argoPush.applicationName,
          repoUrl: argoPush.git?.url ?? '',
          shouldBePresent: true,
        });
      }
    );

    test(
      'RHACM4K-37186: ALC: Delete A Git Source from an Existing Multiple Source ApplicationSet',
      { tag: ['@RHACM4K-37186', '@e2e', '@applicationset'] },
      async ({ oc, applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(600_000);

        const { argoPush } = resolveArgoPushScenarioById('argo_multisource_git_helm_37185');
        await deleteApplicationSetSourceFromWizard(
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          argoPush.applicationName,
          'git'
        );
        await validateApplicationSetSourceRepoUrl(oc, {
          namespace: argoPush.applicationSetNamespace ?? argoPush.argoServerLabel,
          applicationSetName: argoPush.applicationName,
          repoUrl: argoPush.git?.url ?? '',
          shouldBePresent: false,
        });
      }
    );

    test(
      'RHACM4K-37187: ALC: Add A Git Source to An Existing ApplicationSet',
      { tag: ['@RHACM4K-37187', '@e2e', '@applicationset'] },
      async ({ applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(600_000);

        const { argoPush } = resolveArgoPushScenarioById('argo_multisource_git_helm_37185');
        await addApplicationSetSourceFromWizard(
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          argoPush.applicationName,
          { type: 'git', git: argoPush.git! }
        );
      }
    );

    test(
      'RHACM4K-37191: ALC: Delete A Helm Source from an Existing Multiple Source ApplicationSet',
      { tag: ['@RHACM4K-37191', '@e2e', '@applicationset'] },
      async ({ oc, applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(600_000);

        const { argoPush } = resolveArgoPushScenarioById('argo_multisource_git_helm_37185');
        if (!argoPush.helm) {
          throw new Error('RHACM4K-37191 requires helm source in scenario payload');
        }
        await deleteApplicationSetSourceFromWizard(
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          argoPush.applicationName,
          'helm'
        );
        await validateApplicationSetSourceRepoUrl(oc, {
          namespace: argoPush.applicationSetNamespace ?? argoPush.argoServerLabel,
          applicationSetName: argoPush.applicationName,
          repoUrl: argoPush.helm.url,
          shouldBePresent: false,
        });
      }
    );

    test(
      'RHACM4K-37192: ALC: Add A Helm Source to An Existing ApplicationSet',
      { tag: ['@RHACM4K-37192', '@e2e', '@applicationset'] },
      async ({ oc, applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(600_000);

        const { argoPush } = resolveArgoPushScenarioById('argo_multisource_git_helm_37185');
        if (!argoPush.helm) {
          throw new Error('RHACM4K-37192 requires helm source in scenario payload');
        }
        await addApplicationSetSourceFromWizard(
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          argoPush.applicationName,
          { type: 'helm', helm: argoPush.helm }
        );
        await validateApplicationSetSourceRepoUrl(oc, {
          namespace: argoPush.applicationSetNamespace ?? argoPush.argoServerLabel,
          applicationSetName: argoPush.applicationName,
          repoUrl: argoPush.helm.url,
          shouldBePresent: true,
        });
      }
    );

    test(
      'RHACM4K-37193: ALC: Delete an ApplicationSet with Multiple Sources',
      { tag: ['@RHACM4K-37193', '@e2e', '@applicationset'] },
      async ({ oc, applicationListPage }) => {
        test.setTimeout(300_000);

        const { argoPush } = resolveArgoPushScenarioById('argo_multisource_git_helm_37185');
        await deleteApplicationSetFromList(applicationListPage, oc, argoPush.applicationName, {
          argoServerNamespace: argoPush.applicationSetNamespace ?? argoPush.argoServerLabel,
        });
      }
    );

    test(
      'RHACM4K-40996: ALC: UI should not throw ClusterSets failed to load error while deploying application set using a GitOpsCluster without cluster set',
      { tag: ['@RHACM4K-40996', '@e2e', '@applicationset', '@pre-restore', '@post-restore'] },
      async ({ oc, applicationListPage, argoPushApplicationCreateWizardPage }) => {
        test.setTimeout(600_000);

        const { argoPush } = resolveArgoPushScenarioById('argo_empty_placement_40996');
        await setupEmptyPlacementApplicationSet(
          oc,
          applicationListPage,
          argoPushApplicationCreateWizardPage,
          argoPush,
          getRepoRoot()
        );
      }
    );

    test(
      'RHACM4K-42704: ALC: Compare application types popup always displays when users click on the link',
      { tag: ['@RHACM4K-42704', '@e2e', '@applicationset'] },
      async ({ applicationListPage }) => {
        await verifyCompareApplicationTypesPopover(applicationListPage);
      }
    );

    test(
      'RHACM4K-59973: ALC: Sync Argo CD Push Model ApplicationSet on Console',
      { tag: ['@RHACM4K-59973', '@e2e', '@applicationset'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(600_000);

        await syncArgoPushApplicationSetFromDetails({
          oc,
          applicationListPage,
          applicationDetailsPage,
          projectRoot: getRepoRoot(),
        });
      }
    );
  }
);
