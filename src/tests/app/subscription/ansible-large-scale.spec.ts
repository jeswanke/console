/** Ansible large-scale ALC integration (CLI deploy + UI sync). Polarion ids in file tags. */
import {
  clearE2eSpecDataCache,
  resolveAnsibleScaleScenarioByTestId,
  resolveAnsibleScaleSuiteConfig,
} from '@config';
import { runAnsibleScaleHookWave } from '@lib/app/ansible-scale/run-hook-wave';
import {
  applyAnsibleScaleFixture,
  cleanupAnsibleScaleFixture,
} from '@lib/app/setup/ansible-scale-fixture';
import { ensureAnsibleScaleSuitePrep } from '@lib/app/setup/ansible-scale-prep';
import { skipUnlessPrimaryManagedCluster } from '@lib/cluster/managedClusterContext';
import { test } from '@fixtures/app-test';

test.describe('Ansible Large Scale', {
  tag: ['@ALC', '@ansible', '@ansible-scale', '@alc', '@app'],
}, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ oc }) => {
    await ensureAnsibleScaleSuitePrep(oc);
  });

  test.beforeEach(() => {
    clearE2eSpecDataCache();
  });

  test(
    'RHACM4K-42375: ALC: Ansible large scale integration - Deploy and sync an ansible appsub with only 1 prehook job on a real managed cluster',
    { tag: ['@RHACM4K-42375', '@UI', '@e2e-ansible'] },
    async ({ oc, applicationDetailsPage, managedClusterContext }) => {
      test.setTimeout(900_000);

      const managedCluster = skipUnlessPrimaryManagedCluster(
        test,
        managedClusterContext,
        'RHACM4K-42375'
      );
      if (!managedCluster) return;

      const { ansibleScale: scenario } = resolveAnsibleScaleScenarioByTestId('RHACM4K-42375');
      const suite = resolveAnsibleScaleSuiteConfig();
      let appliedManifestPath: string | undefined;

      try {
        await test.step('Deploy ansible appsub with one prehook on managed cluster', async () => {
          const applied = await applyAnsibleScaleFixture(
            oc,
            scenario,
            suite,
            managedCluster.name
          );
          appliedManifestPath = applied.appliedManifestPath;
        });

        await test.step('Run prehook hook wave (sync, patch, second prehook)', async () => {
          await runAnsibleScaleHookWave({
            oc,
            applicationDetailsPage,
            scenario,
            managedClusterName: managedCluster.name,
          });
        });
      } finally {
        await cleanupAnsibleScaleFixture(oc, scenario, suite, {
          appliedManifestPath,
          managedClusterName: managedCluster.name,
        });
      }
    }
  );

  test(
    'RHACM4K-42376: ALC: Ansible large scale integration - Deploy and sync an ansible appsub with only 1 posthook job on a real managed cluster',
    { tag: ['@RHACM4K-42376', '@UI', '@e2e-ansible'] },
    async ({ oc, applicationDetailsPage, managedClusterContext }) => {
      test.setTimeout(900_000);

      const managedCluster = skipUnlessPrimaryManagedCluster(
        test,
        managedClusterContext,
        'RHACM4K-42376'
      );
      if (!managedCluster) return;

      const { ansibleScale: scenario } = resolveAnsibleScaleScenarioByTestId('RHACM4K-42376');
      const suite = resolveAnsibleScaleSuiteConfig();
      let appliedManifestPath: string | undefined;

      try {
        await test.step('Deploy ansible appsub with one posthook on managed cluster', async () => {
          const applied = await applyAnsibleScaleFixture(
            oc,
            scenario,
            suite,
            managedCluster.name
          );
          appliedManifestPath = applied.appliedManifestPath;
        });

        await test.step('Run posthook hook wave (spoke verify, patch, sync, second posthook)', async () => {
          await runAnsibleScaleHookWave({
            oc,
            applicationDetailsPage,
            scenario,
            managedClusterName: managedCluster.name,
          });
        });
      } finally {
        await cleanupAnsibleScaleFixture(oc, scenario, suite, {
          appliedManifestPath,
          managedClusterName: managedCluster.name,
        });
      }
    }
  );
});
