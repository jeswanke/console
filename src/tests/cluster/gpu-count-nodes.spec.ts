import { test, expect } from '@fixtures/acm-test';
import { OcCliService } from '@services/OcCliService';
import { ObservabilityService } from '@services/ObservabilityService';
import { CLUSTER_TABLE_COLUMNS } from '@constants/cluster';

test.describe(
  'GPU Count Column in Cluster Nodes Table',
  { tag: ['@clusters'] },
  () => {
    let isObservabilityInstalled: boolean;
    let clusters: string[];
    let grafanaAnnotation: string;

    test.beforeAll(async () => {
      const svc = new ObservabilityService(new OcCliService());
      isObservabilityInstalled = await svc.isInstalled();
      clusters = await svc.getManagedClusters();
      grafanaAnnotation = await svc.getGrafanaAnnotation();
    });

    test.afterAll(async () => {
      const svc = new ObservabilityService(new OcCliService());
      await svc.restoreGrafanaAnnotation(grafanaAnnotation);
    });

    test('RHACM4K-64019: GPU Count Column in Cluster Nodes Table', async ({
      clusterNodesPage,
    }) => {
      test.skip(
        !isObservabilityInstalled,
        'multicluster-observability is not installed on the hub',
      );
      test.skip(
        clusters.length < 1,
        'No non-local managed clusters available',
      );
      test.setTimeout(180_000);

      const cluster = clusters[0];

      await clusterNodesPage.goto(cluster, cluster);
      await clusterNodesPage.forceNativeTableLayout();

      const gpuHeader = clusterNodesPage.getColumnHeader(
        CLUSTER_TABLE_COLUMNS.gpuCount,
      );

      await test.step(
        'Verify GPU count column appears with Observability',
        async () => {
          await expect(async () => {
            await expect(gpuHeader).toBeAttached();
          }).toPass({
            intervals: [2_000, 3_000, 5_000],
            timeout: 60_000,
          });

          await expect(gpuHeader).toBeVisible({ timeout: 10_000 });
        },
      );

      await test.step('Verify GPU count values', async () => {
        const values = await clusterNodesPage.getColumnValues(
          CLUSTER_TABLE_COLUMNS.gpuCount,
        );

        expect(values.length).toBeGreaterThanOrEqual(1);
        for (const val of values) {
          const numericValue = Number(val);
          expect(
            Number.isInteger(numericValue) && numericValue >= 0,
          ).toBe(true);
        }
      });

      await test.step(
        'Verify GPU count column header tooltip content',
        async () => {
          const infoButton = gpuHeader.getByRole('button', {
            name: 'More info',
          });
          await infoButton.click();

          const popoverBody = clusterNodesPage.getPopoverBody();
          await expect(popoverBody).toBeVisible();
          await expect(popoverBody).toContainText(
            'accelerator_card_info',
          );
          await expect(popoverBody).toContainText(
            'Observability is installed',
          );

          const metricsLink =
            clusterNodesPage.getObservabilityMetricsLink();
          await expect(metricsLink).toBeVisible();
        },
      );

      await test.step(
        'Verify Observability metrics link in tooltip',
        async () => {
          const metricsLink =
            clusterNodesPage.getObservabilityMetricsLink();

          const href = await metricsLink.getAttribute('href');
          expect(href).toContain('accelerator_card_info');
        },
      );

      await test.step(
        'Verify numeric sorting on GPU count column',
        async () => {
          const sortButton = gpuHeader.getByRole('button', {
            name: CLUSTER_TABLE_COLUMNS.gpuCount,
          });
          await sortButton.click();
          await expect(gpuHeader).toHaveAttribute(
            'aria-sort',
            'ascending',
          );

          const valuesAsc = (
            await clusterNodesPage.getColumnValues(
              CLUSTER_TABLE_COLUMNS.gpuCount,
            )
          ).map(Number);

          const sortedAsc = [...valuesAsc].sort((a, b) => a - b);
          expect(valuesAsc).toEqual(sortedAsc);

          await sortButton.click();
          await expect(gpuHeader).toHaveAttribute(
            'aria-sort',
            'descending',
          );

          const valuesDesc = (
            await clusterNodesPage.getColumnValues(
              CLUSTER_TABLE_COLUMNS.gpuCount,
            )
          ).map(Number);

          const sortedDesc = [...valuesDesc].sort(
            (a, b) => b - a,
          );
          expect(valuesDesc).toEqual(sortedDesc);
        },
      );

      await test.step(
        'Verify GPU count column on second managed cluster',
        async () => {
          if (clusters.length < 2) {
             
            console.log(
              'Skipping cross-cluster check: only one non-local managed cluster available',
            );
            return;
          }

          const secondCluster = clusters[1];
          await clusterNodesPage.goto(
            secondCluster,
            secondCluster,
          );
          await clusterNodesPage.forceNativeTableLayout();

          const gpuHeaderSecond =
            clusterNodesPage.getColumnHeader(
              CLUSTER_TABLE_COLUMNS.gpuCount,
            );
          await expect(async () => {
            await expect(gpuHeaderSecond).toBeAttached();
          }).toPass({
            intervals: [2_000, 3_000],
            timeout: 30_000,
          });

          await expect(gpuHeaderSecond).toBeVisible({
            timeout: 10_000,
          });

          const values = await clusterNodesPage.getColumnValues(
            CLUSTER_TABLE_COLUMNS.gpuCount,
          );
          expect(values.length).toBeGreaterThanOrEqual(1);
          for (const val of values) {
            expect(Number.isInteger(Number(val))).toBe(true);
          }
        },
      );

      await test.step(
        'Verify tooltip without Grafana launch-link annotation',
        async () => {
          if (!grafanaAnnotation) {
             
            console.log(
              'Skipping annotation removal test: no Grafana annotation present',
            );
            return;
          }

          const svc = new ObservabilityService(
            new OcCliService(),
          );
          await svc.removeGrafanaAnnotation();

          await clusterNodesPage.goto(cluster, cluster);
          await clusterNodesPage.forceNativeTableLayout();

          await expect(async () => {
            await expect(gpuHeader).toBeAttached();
          }).toPass({
            intervals: [2_000, 3_000],
            timeout: 30_000,
          });

          const infoButton = gpuHeader.getByRole('button', {
            name: 'More info',
          });
          await infoButton.click();

          const popoverBody = clusterNodesPage.getPopoverBody();
          await expect(popoverBody).toBeVisible();
          await expect(popoverBody).toContainText(
            'accelerator_card_info',
          );

          const metricsLink =
            clusterNodesPage.getObservabilityMetricsLink();
          await expect(metricsLink).toBeHidden();
        },
      );
    });
  },
);
