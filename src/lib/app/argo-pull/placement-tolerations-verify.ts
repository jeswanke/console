/** @deprecated Import from `@lib/app/argo/placement-tolerations-verify` — kept for pull-only call sites. */
export {
  verifyAddArgoServerModalHasNoTolerationsForm,
  verifyAddArgoServerModalPlacementTolerationsInYaml,
  verifyDefaultArgoPlacementTolerationsInYaml as verifyDefaultArgoPullPlacementTolerationsInYaml,
  verifyUnreachableTolerationUpdatedInArgoYaml as verifyUnreachableTolerationUpdatedInArgoPullYaml,
  verifyDefaultTolerationSummaryChipsVisible,
  verifyDefaultTolerationFieldsWhenExpanded,
  editUnreachableTolerationInForm,
  verifyUnreachableTolerationUpdatedInUi,
  deleteUnavailableTolerationInForm,
  verifyUnavailableTolerationRemovedFromUi,
  verifyUnavailableTolerationRemovedFromYaml,
  addCustomTolerationInForm,
  verifyCustomTolerationInYaml,
} from '@lib/app/argo/placement-tolerations-verify';

import { expect } from '@playwright/test';
import type { ArgoPullApplicationCreateWizardPage } from '@pages/app/ArgoPullApplicationCreateWizardPage';

export async function verifyCreateArgoPullWizardTitle(
  wizard: ArgoPullApplicationCreateWizardPage
): Promise<void> {
  await expect(wizard.getPageTitle()).toBeVisible();
}
