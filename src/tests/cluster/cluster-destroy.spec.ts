/**
 * Cluster destruction — discover e2e-created clusters by label, destroy via UI.
 *
 * Designed to run independently of the create test. Clusters are discovered
 * by the labels applied during creation (`owner=acmqe-e2e-auto`, `clc-e2e=true`)
 * combined with the ACM auto-applied `cloud=<provider>` label.
 *
 * Filter providers at runtime:
 *   CLC_PROVIDERS=aws,gcp npx playwright test --project=cluster -g "Cluster Destroy"
 */
import { test, expect } from '@fixtures/acm-test';
import { PROVIDER_CLOUD_LABEL } from '@constants/cluster-create';
import { destroyClusterViaUI } from '@lib/cluster/destroy-cluster';
import { waitForClusterDestroyed } from '@lib/cluster/wait-for-cluster-ready';

const providers = (process.env.CLC_PROVIDERS ?? 'aws,gcp,azure,azgov,vmware,openstack')
  .split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);

test.describe('Cluster Destroy', { tag: ['@cluster', '@clc', '@destroy'] }, () => {
  for (const provider of providers) {
    const cloudLabel = PROVIDER_CLOUD_LABEL[provider];
    if (!cloudLabel) continue;

    test(
      `Destroy ${provider.toUpperCase()} clusters`,
      { tag: [`@${provider}`] },
      async ({ page, oc, clusterListPage }) => {
        test.setTimeout(1_800_000);

        const labelSelector =
          `owner=acmqe-e2e-auto,clc-e2e=true,cloud=${cloudLabel},name!=local-cluster`;

        const clusters = await test.step('Discover clusters by label', async () => {
          const names = await oc.getManagedClustersByLabel(labelSelector);
          test.skip(names.length === 0, `No ${provider} e2e clusters to destroy`);
          return names;
        });

        for (const clusterName of clusters) {
          await test.step(`Destroy ${clusterName} via UI`, async () => {
            await destroyClusterViaUI(page, clusterListPage, clusterName);
          });

          await test.step(`Wait for ${clusterName} destruction`, async () => {
            await waitForClusterDestroyed(oc, clusterName, { timeout: 30 * 60_000 });
          });

          await test.step(`Verify ${clusterName} gone from UI`, async () => {
            await clusterListPage.goto();
            const row = page.getByRole('row', { name: clusterName });
            await expect(row).not.toBeVisible({ timeout: 10_000 });
          });
        }
      },
    );
  }
});
