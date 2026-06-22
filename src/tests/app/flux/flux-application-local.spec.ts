/**
 * RHACM4K-16762–16781 — Flux CD applications on local cluster (UI: Overview table + Topology).
 *
 * Cypress: `Flux_Application_Local_Test_Suite.cy.js`.
 * Scenario data: `src/config/e2e-spec-data/applications/flux.yaml`.
 */
import {
  clearE2eSpecDataCache,
  resolveFluxScenarioByTestId,
  resolveFluxScenarioPair,
} from '@config';
import {
  applyFluxApp,
  applyFluxLocalRepos,
  deleteFluxApp,
  waitForFluxDeploymentReady,
} from '@lib/app/setup/flux-local-apps';
import {
  verifyFluxApplicationInUi,
  verifyFluxApplicationOverviewTable,
  verifyFluxApplicationRemovedFromTable,
  verifyFluxApplicationTopology,
} from '@lib/app/verify/flux-local-ui';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Flux Application Test Suite - Local Cluster',
  { tag: ['@ALC', '@flux', '@flux-local', '@e2e-flux', '@UI'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({ oc }) => {
      test.setTimeout(120_000);
      await applyFluxLocalRepos(oc);
    });

    test.beforeEach(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-16762: Verify FluxCD Git Application on local cluster appears in Applications table and topology',
      {
        tag: [
          '@RHACM4K-16762',
          '@UI',
          '@pre-restore',
          '@post-restore',
          '@pre-upgrade',
          '@post-upgrade',
        ],
      },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(900_000);
        const { flux } = resolveFluxScenarioByTestId('RHACM4K-16762');
        await applyFluxApp(oc, flux);
        await waitForFluxDeploymentReady(oc, flux.namespace, flux.deployment);
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: flux,
        });
        await deleteFluxApp(oc, flux);
      }
    );

    test(
      'RHACM4K-16763: Verify FluxCD Helm Application on local cluster appears in Applications table and topology',
      { tag: ['@RHACM4K-16763', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(900_000);
        const { flux } = resolveFluxScenarioByTestId('RHACM4K-16763');
        await applyFluxApp(oc, flux);
        await waitForFluxDeploymentReady(oc, flux.namespace, flux.deployment);
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: flux,
        });
        await deleteFluxApp(oc, flux);
      }
    );

    test(
      'RHACM4K-16764: Verify FluxCD Git Application update after edit is reflected in table and topology',
      { tag: ['@RHACM4K-16764', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(1_200_000);
        const { base, delta } = resolveFluxScenarioPair({
          baseScenarioId: 'flux_git_edit_local_initial',
          testId: 'RHACM4K-16764',
        });

        await applyFluxApp(oc, base.flux);
        await waitForFluxDeploymentReady(oc, base.flux.namespace, base.flux.deployment);
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: base.flux,
        });

        await applyFluxApp(oc, delta.flux);
        await waitForFluxDeploymentReady(oc, delta.flux.namespace, delta.flux.deployment);
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: delta.flux,
        });
        await deleteFluxApp(oc, delta.flux);
      }
    );

    test(
      'RHACM4K-16769: Verify FluxCD Helm Application update after edit is reflected in table and topology',
      { tag: ['@RHACM4K-16769', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(1_200_000);
        const { base, delta } = resolveFluxScenarioPair({
          baseScenarioId: 'flux_helm_edit_local_initial',
          testId: 'RHACM4K-16769',
        });

        await applyFluxApp(oc, base.flux);
        await waitForFluxDeploymentReady(oc, base.flux.namespace, base.flux.deployment);
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: base.flux,
        });

        await applyFluxApp(oc, delta.flux);
        await waitForFluxDeploymentReady(oc, delta.flux.namespace, delta.flux.deployment);
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: delta.flux,
        });
        await deleteFluxApp(oc, delta.flux);
      }
    );

    test(
      'RHACM4K-16779: Verify FluxCD Git Application deletion is reflected in Applications table',
      { tag: ['@RHACM4K-16779', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(900_000);
        const { flux } = resolveFluxScenarioByTestId('RHACM4K-16779');
        await applyFluxApp(oc, flux);
        await waitForFluxDeploymentReady(oc, flux.namespace, flux.deployment);
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: flux,
        });
        await deleteFluxApp(oc, flux);
        await verifyFluxApplicationRemovedFromTable({
          applicationListPage,
          applicationName: flux.applicationName,
        });
      }
    );

    test(
      'RHACM4K-16781: Verify FluxCD Helm Application deletion is reflected in Applications table',
      { tag: ['@RHACM4K-16781', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(900_000);
        const { flux } = resolveFluxScenarioByTestId('RHACM4K-16781');
        await applyFluxApp(oc, flux);
        await waitForFluxDeploymentReady(oc, flux.namespace, flux.deployment);
        await verifyFluxApplicationOverviewTable({ applicationListPage, spec: flux });
        await verifyFluxApplicationTopology({
          applicationDetailsPage,
          spec: flux,
        });
        await deleteFluxApp(oc, flux);
        await verifyFluxApplicationRemovedFromTable({
          applicationListPage,
          applicationName: flux.applicationName,
        });
      }
    );
  }
);
