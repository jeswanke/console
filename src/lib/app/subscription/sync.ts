/**
 * Trigger subscription app reconciliation from **Details** → **Sync** (hub `#sync-app` flow).
 */

import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';

export type SyncSubscriptionApplicationParams = {
  detailsPage: ApplicationDetailsPage;
  /** Poll until **Sync** is enabled; forwarded to {@link ApplicationDetailsPage.syncApplication}. */
  timeout?: number;
};

/**
 * Waits for **Sync** to become enabled, confirms **Synchronize** in the modal. Caller must already show **Details**
 * (e.g. {@link ApplicationDetailsPage.navigateToApplicationTab} with tab `details`).
 */
export async function syncSubscriptionApplication(
  params: SyncSubscriptionApplicationParams
): Promise<void> {
  await params.detailsPage.syncApplication({ timeout: params.timeout });
}
