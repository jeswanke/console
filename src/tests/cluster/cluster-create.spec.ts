/**
 * Cluster creation — data-driven, parallel across providers.
 *
 * Each enabled scenario from `create.yaml` becomes an independent test.
 * Providers run in parallel (fullyParallel config); wizard → wait → verify
 * is sequential within each test via test.step().
 *
 * Filter providers at runtime:
 *   CLC_PROVIDERS=aws,gcp,azure npx playwright test --project=cluster -g "Cluster Creation"
 *
 * Scenario data: `src/config/e2e-spec-data/cluster/create.yaml`
 * Secrets: `env/clc.local.env`
 */
import { test, expect } from '@fixtures/acm-test';
import { resolveEnabledClusterCreateScenarios } from '@config';
import { fillCreateClusterWizard } from '@lib/cluster/create-cluster';
import { setupCredential } from '@lib/cluster/credential-setup';
import {
  waitForClusterReady,
  waitForHostedClusterReady,
  assertManagedClusterJoined,
  assertInstallAttemptCount,
  assertClusterSecrets,
  assertClusterLabels,
  assertAcmAutoLabels,
} from '@lib/cluster/wait-for-cluster-ready';

const allScenarios = resolveEnabledClusterCreateScenarios();

const providerFilter = process.env.CLC_PROVIDERS
  ?.split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);

const scenarios = providerFilter
  ? allScenarios.filter((s) => providerFilter.includes(s.cluster.provider))
  : allScenarios;

let latestImageSetVersion: string;

test.describe('Cluster Creation', { tag: ['@cluster', '@clc', '@create'] }, () => {
  test.beforeAll(async ({ oc }) => {
    await oc.ensureManagedClusterSet('auto-gitops-cluster-set');
    latestImageSetVersion = await oc.getLatestClusterImageSetVersion();
  });

  for (const scenario of scenarios) {
    const testId = scenario.testIds[0]!;
    const provider = scenario.cluster.provider;

    test(
      `${testId}: Create ${provider.toUpperCase()} cluster`,
      { tag: [`@${testId}`, `@${provider}`] },
      async ({ page, oc, clusterListPage, createClusterWizardPage, clcConfig }) => {
        test.setTimeout(3_600_000);

        const clusterName = scenario.cluster.fixedClusterName
          ?? `${scenario.cluster.namePrefix}-${Date.now()}`;

        const ocpRelease = process.env.CLC_OCP_IMAGE_VERSION
          ? clcConfig.ocpRelease
          : { ...clcConfig.ocpRelease, version: latestImageSetVersion };

        await test.step('Setup credential', async () => {
          await setupCredential(oc, provider, scenario.credential, clcConfig);
        });

        await test.step('Fill wizard and create cluster', async () => {
          await clusterListPage.goto();
          await fillCreateClusterWizard(clusterListPage, createClusterWizardPage, {
            cluster: scenario.cluster,
            credentialName: scenario.credential.name,
            clusterName,
            ocpRelease,
          });
        });

        const isHosted = scenario.cluster.controlPlaneType === 'hosted';

        await test.step('Wait for cluster ready', async () => {
          if (isHosted) {
            await waitForHostedClusterReady(oc, clusterName, { timeout: 60 * 60_000 });
          } else {
            await waitForClusterReady(oc, clusterName, { timeout: 60 * 60_000 });
          }
        });

        if (scenario.cluster.architecture) {
          await test.step('Apply nodeArchitecture label', async () => {
            await oc.run(
              `oc label managedcluster ${clusterName} nodeArchitecture=${scenario.cluster.architecture} --overwrite`,
            );
          });
        }

        await test.step('Verify cluster status Ready in UI', async () => {
          await createClusterWizardPage.expectOnOverviewPage(clusterName);
          const statusButton = page.locator('.pf-v6-c-description-list')
            .getByRole('button', { name: 'Ready' });
          await expect(statusButton).toBeVisible({ timeout: 60_000 });
        });

        if (!isHosted) {
          await test.step('Verify install attempts', async () => {
            await assertInstallAttemptCount(oc, clusterName, 1);
          });

          await test.step('Verify cluster secrets', async () => {
            await assertClusterSecrets(oc, clusterName, provider);
          });
        }

        await test.step('Verify ManagedCluster joined', async () => {
          await assertManagedClusterJoined(oc, clusterName);
        });

        await test.step('Verify ACM auto-applied labels', async () => {
          await assertAcmAutoLabels(oc, clusterName, provider);
        });

        await test.step('Verify cluster labels', async () => {
          await assertClusterLabels(oc, clusterName, scenario.cluster.additionalLabels);
        });

        await test.step('Verify work-manager addon available', async () => {
          const labelsJson = await oc.run(
            `oc get managedcluster ${clusterName} -o jsonpath='{.metadata.labels}'`,
          );
          const labels = JSON.parse(labelsJson.replace(/'/g, ''));
          expect(
            labels['feature.open-cluster-management.io/addon-work-manager'],
            'work-manager addon label',
          ).toBe('available');
        });

        await test.step('Verify cluster visible in cluster list', async () => {
          await clusterListPage.goto();
          await clusterListPage.searchCluster(clusterName);
          const row = page.getByRole('row', { name: clusterName });
          await expect(row.getByText('Ready')).toBeVisible({ timeout: 30_000 });
        });
      },
    );
  }
});
