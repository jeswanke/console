/**
 * Cluster import — discover kubeconfig files, import via UI, verify.
 *
 * Kubeconfig files are placed in `.auth/importClusters/` (or CLC_IMPORT_DIR).
 * Filename suffix determines platform type:
 *   *-eks.kubeconfig → EKS, *-aks.kubeconfig → AKS, etc.
 *
 * Filter platforms at runtime:
 *   CLC_IMPORT_TYPES=eks,aks npx playwright test --project=cluster -g "Cluster Import"
 */
import fs from 'fs';
import path from 'path';
import { test, expect } from '@fixtures/acm-test';
import { importClusterViaKubeconfig } from '@lib/cluster/import-cluster';
import { assertManagedClusterJoined } from '@lib/cluster/wait-for-cluster-ready';
import { detectPlatformType } from '@constants/cluster-import';

const importDir = process.env.CLC_IMPORT_DIR
  ?? path.resolve(process.cwd(), 'fixtures/importClusters');

const typeFilter = process.env.CLC_IMPORT_TYPES
  ?.split(',')
  .map((t) => t.trim().toLowerCase())
  .filter(Boolean);

interface ImportScenario {
  filename: string;
  clusterName: string;
  filePath: string;
  vendor: string;
  cloud: string;
  platformKey: string;
  testId: string;
}

function discoverKubeconfigs(): ImportScenario[] {
  if (!fs.existsSync(importDir)) return [];

  return fs.readdirSync(importDir)
    .filter((f) => f.endsWith('.kubeconfig'))
    .map((filename) => {
      const platform = detectPlatformType(filename);
      if (!platform) return null;

      if (typeFilter && !typeFilter.includes(platform.key)) return null;

      return {
        filename,
        clusterName: filename.replace('.kubeconfig', ''),
        filePath: path.join(importDir, filename),
        vendor: platform.vendor,
        cloud: platform.cloud,
        platformKey: platform.key,
        testId: platform.importTestId,
      };
    })
    .filter((s): s is ImportScenario => s !== null);
}

const scenarios = discoverKubeconfigs();

test.describe('Cluster Import', { tag: ['@cluster', '@clc', '@import'] }, () => {
  test.skip(scenarios.length === 0, 'No kubeconfig files found in import directory');

  for (const scenario of scenarios) {
    test(
      `${scenario.testId}: Import ${scenario.platformKey.toUpperCase()} cluster by kubeconfig`,
      { tag: [`@${scenario.testId}`, `@${scenario.platformKey}`] },
      async ({ page, oc, clusterListPage, importClusterWizardPage }) => {
        test.setTimeout(600_000);

        const kubeconfig = fs.readFileSync(scenario.filePath, 'utf-8');

        await test.step('Import cluster via kubeconfig wizard', async () => {
          await importClusterViaKubeconfig(importClusterWizardPage, {
            clusterName: scenario.clusterName,
            kubeconfig,
            clusterSet: 'auto-gitops-cluster-set',
            additionalLabels: {
              owner: 'acmqe-e2e-auto',
              'clc-e2e': 'true',
            },
          });
        });

        await test.step('Retain auto-import-secret', async () => {
          // Retry — the secret is created asynchronously by the import controller
          for (let i = 0; i < 10; i++) {
            const result = await oc.run(
              `oc annotate secret auto-import-secret -n ${scenario.clusterName} ` +
                `managedcluster-import-controller.open-cluster-management.io/keeping-auto-import-secret="" ` +
                `--overwrite 2>&1 || true`,
            );
            if (!result.includes('NotFound')) break;
            await new Promise((r) => setTimeout(r, 3_000));
          }
        });

        await test.step('Verify overview page', async () => {
          const statusIndicator = page.locator('.pf-v6-c-description-list')
            .getByText(/Ready|Importing/);
          await expect(statusIndicator).toBeVisible({ timeout: 60_000 });
        });

        await test.step('Wait for ManagedCluster joined', async () => {
          await assertManagedClusterJoined(oc, scenario.clusterName);
        });

        await test.step('Verify vendor and cloud labels', async () => {
          // ACM initially sets vendor=auto-detect, then resolves after klusterlet reports.
          // Poll until vendor is resolved (up to 2 min).
          let labels: Record<string, string> = {};
          for (let i = 0; i < 24; i++) {
            const labelsJson = await oc.run(
              `oc get managedcluster ${scenario.clusterName} -o jsonpath='{.metadata.labels}'`,
            );
            labels = JSON.parse(labelsJson.replace(/'/g, ''));
            if (labels.vendor && labels.vendor !== 'auto-detect') break;
            await new Promise((r) => setTimeout(r, 5_000));
          }
          expect(labels.vendor, 'vendor label').toBe(scenario.vendor);
          expect(labels.cloud, 'cloud label').toBe(scenario.cloud);
        });

        await test.step('Verify cluster status Ready in UI', async () => {
          const statusButton = page.locator('.pf-v6-c-description-list')
            .getByRole('button', { name: 'Ready' });
          await expect(statusButton).toBeVisible({ timeout: 300_000 });
        });

        await test.step('Verify cluster visible in cluster list', async () => {
          await clusterListPage.goto();
          await clusterListPage.searchCluster(scenario.clusterName);
          const row = page.getByRole('row', { name: scenario.clusterName });
          await expect(row.getByText('Ready')).toBeVisible({ timeout: 30_000 });
        });
      },
    );
  }
});
