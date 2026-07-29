/**
 * RHACM4K-16783–16788 — Flux CD applications on managed cluster (UI: Overview table + Topology).
 *
 * Cypress: `Flux_Application_Managed_Test_Suite.cy.js`.
 * Scenario data: `src/config/e2e-spec-data/applications/flux.yaml`.
 */
import {
  clearE2eSpecDataCache,
  resolveFluxScenarioByTestId,
  resolveFluxScenarioPair,
} from '@config';
import { withFluxClusterName } from '@lib/app/flux/types';
import {
  applyFluxAppOnCluster,
  applyFluxReposOnCluster,
  deleteFluxAppOnCluster,
  waitForFluxDeploymentReadyOnCluster,
} from '@lib/app/setup/flux-local-apps';
import {
  verifyFluxApplicationInUi,
  verifyFluxApplicationOverviewTable,
  verifyFluxApplicationRemovedFromTable,
  verifyFluxApplicationTopology,
} from '@lib/app/verify/flux-local-ui';
import { skipUnlessPrimaryManagedCluster } from '@lib/cluster/managedClusterContext';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Flux Application Test Suite - Managed Cluster',
  { tag: ['@ALC', '@flux', '@flux-managed', '@e2e-flux', '@UI'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    let managedClusterName: string | undefined;

    test.beforeAll(async ({ oc, managedClusterContext }) => {
      test.setTimeout(120_000);
      const entry = skipUnlessPrimaryManagedCluster(
        test,
        managedClusterContext,
        'Flux managed cluster'
      );
      if (!entry) {
        return;
      }
      managedClusterName =
        process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || entry.name;
      await applyFluxReposOnCluster(oc, managedClusterName);
    });

    test.beforeAll(() => {
      clearE2eSpecDataCache();
    });

    test(
      'RHACM4K-16783: ALC: Verify FluxCD Git Application on managed cluster appears in Applications table and topology',
      { tag: ['@RHACM4K-16783', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        if (!managedClusterName) return;
        test.setTimeout(600_000);
        const { flux } = resolveFluxScenarioByTestId('RHACM4K-16783');
        const spec = withFluxClusterName(flux, managedClusterName);
        await applyFluxAppOnCluster(oc, spec, managedClusterName);
        await waitForFluxDeploymentReadyOnCluster(
          oc,
          spec.namespace,
          spec.deployment,
          managedClusterName
        );
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec,
        });
        await deleteFluxAppOnCluster(oc, spec, managedClusterName);
      }
    );

    test(
      'RHACM4K-16784: ALC: Verify FluxCD Helm Application on managed cluster appears in Applications table and topology',
      { tag: ['@RHACM4K-16784', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        if (!managedClusterName) return;
        test.setTimeout(600_000);
        const { flux } = resolveFluxScenarioByTestId('RHACM4K-16784');
        const spec = withFluxClusterName(flux, managedClusterName);
        await applyFluxAppOnCluster(oc, spec, managedClusterName);
        await waitForFluxDeploymentReadyOnCluster(
          oc,
          spec.namespace,
          spec.deployment,
          managedClusterName
        );
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec,
        });
        await deleteFluxAppOnCluster(oc, spec, managedClusterName);
      }
    );

    test(
      'RHACM4K-16785: ALC: Verify FluxCD Git Application update after edit is reflected in table and topology',
      { tag: ['@RHACM4K-16785', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        if (!managedClusterName) return;
        test.setTimeout(900_000);
        const { base, delta } = resolveFluxScenarioPair({
          baseScenarioId: 'flux_git_edit_managed_initial',
          testId: 'RHACM4K-16785',
        });
        const baseSpec = withFluxClusterName(base.flux, managedClusterName);
        const deltaSpec = withFluxClusterName(delta.flux, managedClusterName);

        await applyFluxAppOnCluster(oc, baseSpec, managedClusterName);
        await waitForFluxDeploymentReadyOnCluster(
          oc,
          baseSpec.namespace,
          baseSpec.deployment,
          managedClusterName
        );
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: baseSpec,
        });

        await applyFluxAppOnCluster(oc, deltaSpec, managedClusterName);
        await waitForFluxDeploymentReadyOnCluster(
          oc,
          deltaSpec.namespace,
          deltaSpec.deployment,
          managedClusterName
        );
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: deltaSpec,
        });
        await deleteFluxAppOnCluster(oc, deltaSpec, managedClusterName);
      }
    );

    test(
      'RHACM4K-16786: ALC: Verify FluxCD Helm Application update after edit is reflected in table and topology',
      { tag: ['@RHACM4K-16786', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        if (!managedClusterName) return;
        test.setTimeout(900_000);
        const { base, delta } = resolveFluxScenarioPair({
          baseScenarioId: 'flux_helm_edit_managed_initial',
          testId: 'RHACM4K-16786',
        });
        const baseSpec = withFluxClusterName(base.flux, managedClusterName);
        const deltaSpec = withFluxClusterName(delta.flux, managedClusterName);

        await applyFluxAppOnCluster(oc, baseSpec, managedClusterName);
        await waitForFluxDeploymentReadyOnCluster(
          oc,
          baseSpec.namespace,
          baseSpec.deployment,
          managedClusterName
        );
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: baseSpec,
        });

        await applyFluxAppOnCluster(oc, deltaSpec, managedClusterName);
        await waitForFluxDeploymentReadyOnCluster(
          oc,
          deltaSpec.namespace,
          deltaSpec.deployment,
          managedClusterName
        );
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec: deltaSpec,
        });
        await deleteFluxAppOnCluster(oc, deltaSpec, managedClusterName);
      }
    );

    test(
      'RHACM4K-16787: ALC: Verify FluxCD Git Application deletion is reflected in Applications table',
      { tag: ['@RHACM4K-16787', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        if (!managedClusterName) return;
        test.setTimeout(600_000);
        const { flux } = resolveFluxScenarioByTestId('RHACM4K-16787');
        const spec = withFluxClusterName(flux, managedClusterName);
        await applyFluxAppOnCluster(oc, spec, managedClusterName);
        await waitForFluxDeploymentReadyOnCluster(
          oc,
          spec.namespace,
          spec.deployment,
          managedClusterName
        );
        await verifyFluxApplicationInUi({
          applicationListPage,
          applicationDetailsPage,
          spec,
        });
        await deleteFluxAppOnCluster(oc, spec, managedClusterName);
        await verifyFluxApplicationRemovedFromTable({
          applicationListPage,
          applicationName: spec.applicationName,
        });
      }
    );

    test(
      'RHACM4K-16788: ALC: Verify FluxCD Helm Application deletion is reflected in Applications table',
      { tag: ['@RHACM4K-16788', '@UI', '@e2e-flux'] },
      async ({ oc, applicationListPage, applicationDetailsPage }) => {
        if (!managedClusterName) return;
        test.setTimeout(600_000);
        const { flux } = resolveFluxScenarioByTestId('RHACM4K-16788');
        const spec = withFluxClusterName(flux, managedClusterName);
        await applyFluxAppOnCluster(oc, spec, managedClusterName);
        await waitForFluxDeploymentReadyOnCluster(
          oc,
          spec.namespace,
          spec.deployment,
          managedClusterName
        );
        await verifyFluxApplicationOverviewTable({ applicationListPage, spec });
        await verifyFluxApplicationTopology({
          applicationDetailsPage,
          spec,
        });
        await deleteFluxAppOnCluster(oc, spec, managedClusterName);
        await verifyFluxApplicationRemovedFromTable({
          applicationListPage,
          applicationName: spec.applicationName,
        });
      }
    );
  }
);
