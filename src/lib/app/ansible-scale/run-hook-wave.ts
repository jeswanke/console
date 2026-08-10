import type { AnsibleScaleScenarioPayload } from '@config';
import { syncAnsibleScaleApplication } from '@lib/app/ansible-scale/sync-application';
import { expectOcGetListContains } from '@lib/assertions/oc-resource-list';
import {
  expectAnsibleJobCountAndPatchAll,
  pollAnsibleJobCount,
  pollAnsibleJobsInclude,
} from '@lib/app/verify/ansible-jobs';
import { withManagedClusterContext } from '@lib/cluster/managed-cluster-oc';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { OcCliService } from '@services/OcCliService';

export type RunAnsibleScaleHookWaveParams = {
  oc: OcCliService;
  applicationDetailsPage: ApplicationDetailsPage;
  scenario: AnsibleScaleScenarioPayload;
  managedClusterName: string;
};

/**
 * Shared ansible hook flow after fixture apply: wait → optional spoke verify → sync → patch → sync → wait.
 * Order matches Cypress large-scale suite (42375 syncs before patch; 42376 syncs after patch).
 */
export async function runAnsibleScaleHookWave(
  params: RunAnsibleScaleHookWaveParams
): Promise<void> {
  const { oc, applicationDetailsPage, scenario, managedClusterName } = params;
  const pollTimeout = scenario.pollTimeoutMs;
  const afterPatchTimeout = scenario.afterPatchPollTimeoutMs ?? pollTimeout;

  await pollAnsibleJobsInclude({
    oc,
    namespace: scenario.namespace,
    substring: scenario.firstJobSubstring,
    timeout: pollTimeout,
    errorMessage: scenario.firstJobWaitErrorMessage,
  });

  if (scenario.managedClusterVerify) {
    const verify = scenario.managedClusterVerify;
    await withManagedClusterContext(oc, managedClusterName, async () => {
      await expectOcGetListContains(oc, {
        resource: verify.resource,
        namespace: scenario.namespace,
        expectedSubstring: verify.expectedSubstring,
        timeout: pollTimeout,
      });
    });
  }

  if (scenario.syncTiming === 'beforePatch') {
    await syncAnsibleScaleApplication(applicationDetailsPage, scenario);
  }

  await expectAnsibleJobCountAndPatchAll(oc, scenario.namespace, scenario.jobCountBeforePatch);

  if (scenario.syncTiming === 'afterPatch') {
    await syncAnsibleScaleApplication(applicationDetailsPage, scenario);
  }

  await pollAnsibleJobCount({
    oc,
    namespace: scenario.namespace,
    count: scenario.jobCountAfterPatch,
    timeout: afterPatchTimeout,
    errorMessage: scenario.afterPatchJobCountErrorMessage,
  });
}
