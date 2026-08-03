/**
 * RHACM4K-58916 — Matrix ApplicationSet (Git + Cluster Decision) via YAML.
 *
 * Cypress: `Argo_Appset_Matrix_Test_Suite.cy.js`.
 */
import { expect } from '@playwright/test';

import { APP_ARGO_MATRIX_APPSET } from '@constants/app';
import {
  applyArgoMatrixAppsetSetup,

  prepareMatrixManagedClusterNamespaces,
  verifyArgoMatrixAppsetInUi,
  waitForMatrixDeployedNamespaces,
} from '@lib/app/setup/argo-matrix-appset';
import { test } from '@fixtures/app-test';

const PLACEMENT_NAME = 'argo-appset-matrix-placement';
const PLACEMENT_NAMESPACE = 'openshift-gitops';

test.describe(
  'Application Lifecycle UI: ApplicationSet matrix (Cluster Decision + Git)',
  { tag: ['@alc', '@gitops', '@e2e', '@applicationset', '@pullmodel', '@argo-matrix'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    let managedClusterName: string;

    test.beforeAll(async ({ oc }) => {
      test.setTimeout(600_000);

      await applyArgoMatrixAppsetSetup(oc);

      await expect
        .poll(() => oc.getPlacementDecisionClusterCount(PLACEMENT_NAMESPACE, PLACEMENT_NAME), {
          timeout: 120_000,
          intervals: [2_000, 5_000, 10_000],
          message: `PlacementDecision ${PLACEMENT_NAME} must select at least 1 cluster`,
        })
        .toBeGreaterThan(0);

      const clusters = await oc.getPlacementDecisionClusterNames(
        PLACEMENT_NAMESPACE,
        PLACEMENT_NAME
      );
      managedClusterName =
        process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || clusters[0] || 'local-cluster';

      await prepareMatrixManagedClusterNamespaces(
        oc,
        managedClusterName,
        APP_ARGO_MATRIX_APPSET.destinationNamespaces
      );
      await waitForMatrixDeployedNamespaces(
        oc,
        managedClusterName,
        [...APP_ARGO_MATRIX_APPSET.destinationNamespaces]
      );
    });

    // test.afterAll(async ({ oc }) => {
    //   await cleanupArgoMatrixAppsetSetup(oc);
    // });

    test(
      'RHACM4K-58916: ALC: Create matrix ApplicationSet, verify applications and topology',
      { tag: ['@RHACM4K-58916', '@e2e', '@applicationset'] },
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
