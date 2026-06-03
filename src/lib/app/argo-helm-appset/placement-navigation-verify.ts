import { expect } from '@playwright/test';

import { APP_APPLICATION_DETAILS, APP_ARGO_HELM_APPSET } from '@constants/app';
import { PLACEMENT_DETAILS } from '@constants/placement';
import type { ApplicationDetailsPage } from '@pages/app/ApplicationDetailsPage';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { PlacementDetailsPage } from '@pages/cluster/PlacementDetailsPage';

export async function verifyApplicationSetDetailsPlacementLink(
  detailsPage: ApplicationDetailsPage,
  options: {
    applicationSetName: string;
    namespace: string;
    placementName: string;
  }
): Promise<void> {
  const { applicationSetName, namespace, placementName } = options;
  await detailsPage.navigateToApplicationTab(namespace, applicationSetName, 'details');
  await detailsPage.expectDetailTabSelected('details');

  await expect(detailsPage.getApplicationHeading()).toHaveText(applicationSetName);
  await expect(
    detailsPage.getDescriptionValue('type')
  ).toContainText(APP_APPLICATION_DETAILS.typeValues.applicationSetPush);
  await expect(detailsPage.getDescriptionValue('namespace')).toHaveText(namespace);

  const placementLink = detailsPage.getDescriptionValue('placement').getByRole('link', {
    name: placementName,
    exact: true,
  });
  await expect(placementLink).toBeVisible();
}

export async function openApplicationSetFromList(
  applicationListPage: ApplicationListPage,
  applicationSetName: string
): Promise<void> {
  await applicationListPage.goto();
  await applicationListPage.applicationsTable.search(applicationSetName);
  const row = applicationListPage.applicationsTable.getRowByName(applicationSetName);
  await expect(row).toBeVisible({ timeout: 120_000 });
  await applicationListPage.applicationsTable.getNameLink(row).click();
  await applicationListPage.waitForLoad();
}

export async function navigateToPlacementFromApplicationSetDetails(
  detailsPage: ApplicationDetailsPage,
  options: {
    namespace: string;
    applicationSetName: string;
    placementName: string;
  }
): Promise<void> {
  const { namespace, applicationSetName, placementName } = options;
  await detailsPage.navigateToApplicationTab(namespace, applicationSetName, 'details');
  await detailsPage
    .getDescriptionValue('placement')
    .getByRole('link', { name: placementName, exact: true })
    .click();
  await detailsPage.waitForLoad();
}

export async function verifyPlacementOverviewFromApplicationSet(
  placementDetailsPage: PlacementDetailsPage,
  options: {
    namespace: string;
    placementName: string;
    applicationSetName: string;
    clusterSet: string;
    targetCluster: string;
    placementDecisionName: string;
  }
): Promise<void> {
  const {
    namespace,
    placementName,
    applicationSetName,
    clusterSet,
    targetCluster,
    placementDecisionName,
  } = options;

  await placementDetailsPage.expectOverviewTabSelected();
  await expect(placementDetailsPage.getPlacementHeading()).toHaveText(placementName);

  await placementDetailsPage.expandSectionIfCollapsed('details');
  await expect(placementDetailsPage.getDetailsCardValue('name')).toHaveText(placementName);
  await expect(placementDetailsPage.getDetailsCardValue('namespace')).toHaveText(namespace);
  await expect(placementDetailsPage.getClusterSetLink(clusterSet)).toBeVisible();
  await expect(placementDetailsPage.getDetailsCardValue('filters')).toContainText('local-cluster');
  await expect(placementDetailsPage.getDetailsCardValue('selectedClusters')).toHaveText('1');

  await placementDetailsPage.expandSectionIfCollapsed('usedIn');
  await expect(placementDetailsPage.getDetailsCardValue('usedIn')).toHaveText('1');
  await expect(placementDetailsPage.getUsedInApplicationLink(applicationSetName)).toBeVisible();
  const usedInGrid = placementDetailsPage.getUsedInApplicationsGrid();
  await expect(usedInGrid.getByRole('gridcell', { name: applicationSetName })).toBeVisible();
  await expect(
    usedInGrid.getByRole('gridcell', {
      name: PLACEMENT_DETAILS.usedInTable.typeApplicationSet,
      exact: true,
    })
  ).toBeVisible();
  await expect(usedInGrid.getByRole('gridcell', { name: namespace, exact: true })).toBeVisible();

  await placementDetailsPage.expandSectionIfCollapsed('placementDecisions');
  await expect(placementDetailsPage.getPlacementDecisionLink(placementDecisionName)).toBeVisible();
  await expect(placementDetailsPage.getPlacementDecisionClusterLink(targetCluster)).toBeVisible();

  await placementDetailsPage.expandSectionIfCollapsed('conditions');
  const conditionsGrid = placementDetailsPage.getConditionsGrid();
  const { placementSatisfied } = PLACEMENT_DETAILS.conditionsTable;
  const satisfiedRow = conditionsGrid.getByRole('row').filter({
    hasText: placementSatisfied.type,
  });
  await expect(satisfiedRow).toBeVisible();
  await expect(satisfiedRow).toContainText(placementSatisfied.status);
  await expect(satisfiedRow).toContainText(placementSatisfied.reason);
}

export function argoHelmAppsetScenario() {
  return APP_ARGO_HELM_APPSET;
}
