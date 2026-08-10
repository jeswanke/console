import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import { syncSubscriptionApplication } from '@lib/app/subscription';
import type { AnsibleScaleScenarioPayload } from '@config';

/** Navigate to subscription app Details and confirm **Sync**. */
export async function syncAnsibleScaleApplication(
  detailsPage: ApplicationDetailsPage,
  scenario: Pick<AnsibleScaleScenarioPayload, 'namespace' | 'applicationName'>
): Promise<void> {
  await detailsPage.navigateToApplicationTab(
    scenario.namespace,
    scenario.applicationName,
    'details'
  );
  await syncSubscriptionApplication({ detailsPage, timeout: 60_000 });
}
