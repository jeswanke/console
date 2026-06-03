import { test, expect } from '@fixtures/acm-test';
import { OcCliService } from '@services/OcCliService';
import { ObservabilityService } from '@services/ObservabilityService';
import { CLUSTER_TABLE_COLUMNS, GPU_COLUMN } from '@constants/cluster';

test.describe(
  'GPU Count Column in Managed Clusters Table',
  { tag: ['@clusters'] },
  () => {
    let isObservabilityInstalled: boolean;

    test.beforeAll(async () => {
      const svc = new ObservabilityService(new OcCliService());
      isObservabilityInstalled = await svc.isInstalled();
    });

    test('RHACM4K-63953: GPU Count Column in Managed Clusters Table', async ({
      clusterListPage,
    }) => {
      test.skip(
        !isObservabilityInstalled,
        'multicluster-observability is not installed on the hub',
      );
      test.setTimeout(180_000);

      await clusterListPage.goto();
      await clusterListPage.forceNativeTableLayout();

      const gpuHeader = clusterListPage.getColumnHeader(
        CLUSTER_TABLE_COLUMNS.gpuCount,
      );

      await test.step(
        'Verify GPU count column is visible',
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

      await test.step(
        'Verify GPU count values are numeric',
        async () => {
          const values = await clusterListPage.getColumnValues(
            CLUSTER_TABLE_COLUMNS.gpuCount,
          );

          expect(values.length).toBeGreaterThanOrEqual(1);
          for (const val of values) {
            const numericValue = Number(val);
            expect(
              Number.isInteger(numericValue) && numericValue >= 0,
            ).toBe(true);
          }
        },
      );

      await test.step(
        'Verify GPU count column tooltip content',
        async () => {
          const infoButton = gpuHeader.getByRole('button', {
            name: 'More info',
          });
          await infoButton.click();

          const popoverBody = clusterListPage.getPopoverBody();
          await expect(popoverBody).toBeVisible();
          await expect(popoverBody).toContainText(
            'accelerator_card_info',
          );
          await expect(popoverBody).toContainText(
            'Observability is installed',
          );

          const metricsLink =
            clusterListPage.getObservabilityMetricsLink();
          await expect(metricsLink).toBeVisible();
        },
      );

      await test.step(
        'Verify Observability metrics link opens Grafana',
        async () => {
          const metricsLink =
            clusterListPage.getObservabilityMetricsLink();

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
            await clusterListPage.getColumnValues(
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
            await clusterListPage.getColumnValues(
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
        'Verify column management toggle for GPU count',
        async () => {
          await clusterListPage.openManageColumns();
          const modal = clusterListPage.getManageColumnsModal();
          await expect(modal).toBeVisible();

          const gpuCheckbox = clusterListPage.getColumnCheckbox(
            GPU_COLUMN.id,
          );
          await expect(gpuCheckbox).toBeAttached();
          await expect(gpuCheckbox).toBeChecked();

          await gpuCheckbox.uncheck();
          await clusterListPage.saveManageColumns();

          await expect(gpuHeader).toBeHidden();

          await clusterListPage.openManageColumns();
          const gpuCheckboxAgain =
            clusterListPage.getColumnCheckbox(GPU_COLUMN.id);
          await gpuCheckboxAgain.check();
          await clusterListPage.saveManageColumns();

          await expect(gpuHeader).toBeAttached();
        },
      );
    });
  },
);
