/**
 * RHACM4K-58916 — Matrix ApplicationSet (Git + Cluster Decision) via YAML.
 *
 * Cypress: `Argo_Appset_Matrix_Test_Suite.cy.js`.
 */
import { APP_ARGO_MATRIX_APPSET } from '@constants/app';
import {
  applyArgoMatrixAppsetSetup,
  cleanupArgoMatrixAppsetSetup,
  prepareMatrixManagedClusterNamespaces,
  verifyArgoMatrixAppsetInUi,
  waitForMatrixDeployedNamespaces,
} from '@lib/app/setup/argo-matrix-appset';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: ApplicationSet matrix (Cluster Decision + Git)',
  { tag: ['@ALC', '@gitops', '@e2e-argo', '@applicationset', '@pullmodel', '@argo-matrix'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    let managedClusterName: string;

    test.beforeAll(async ({ oc }) => {
      managedClusterName =
        process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || 'local-cluster';
      await prepareMatrixManagedClusterNamespaces(
        oc,
        managedClusterName,
        APP_ARGO_MATRIX_APPSET.destinationNamespaces
      );
      await applyArgoMatrixAppsetSetup(oc);
      await waitForMatrixDeployedNamespaces(
        oc,
        managedClusterName,
        [...APP_ARGO_MATRIX_APPSET.destinationNamespaces]
      );
    });

    test.afterAll(async ({ oc }) => {
      await cleanupArgoMatrixAppsetSetup(oc);
    });

    test(
      'RHACM4K-58916: Create matrix ApplicationSet, verify applications and topology',
      { tag: ['@RHACM4K-58916', '@UI', '@e2e-argo', '@applicationset'] },
      async ({ applicationListPage, applicationDetailsPage }) => {
        test.setTimeout(600_000);
        await verifyArgoMatrixAppsetInUi({
          applicationListPage,
          applicationDetailsPage,
          clusterName: managedClusterName,
        });
      }
    );
  }
);
