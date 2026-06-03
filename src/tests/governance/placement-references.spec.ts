/**
 * Governance: Placement references in Policy and PolicySet detail pages.
 *
 * Polarion: RHACM4K-64165
 * Jira: ACM-33799, ACM-30652
 *
 * Verifies that a placement is referenced on the policy detail page,
 * the policy set detail page, and that clicking the placement link
 * navigates to the placement detail page where governance references
 * are listed in the "Used in" section.
 */

import * as path from 'path';
import { test, expect } from '@fixtures/governance-test';
import { OcCliService } from '@services/OcCliService';
import {
  GOV_POLICY_DETAILS,
  GOV_PLACEMENT_DETAILS,
  GOV_TEST_RESOURCES,
} from '@constants/governance';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const RESOURCES_YAML = path.join(TEMPLATES_DIR, 'placement-policy-resources.yaml');

test.describe.serial(
  'Placement references in policy and policy set details',
  { tag: ['@governance'] },
  () => {
    const oc = new OcCliService();
    const ns = GOV_TEST_RESOURCES.namespace;

    test.beforeAll(async () => {
      await oc.applyYaml(RESOURCES_YAML);
    });

    test.afterAll(async () => {
      await oc.deleteYaml(RESOURCES_YAML);
    });

    // Polarion steps 1-2: Policy visible in list
    test('RHACM4K-64165: policy appears on the policies list', async ({ governancePage }) => {
      await governancePage.goto();
      await governancePage.openPoliciesTab();
      await governancePage.searchPolicies(GOV_TEST_RESOURCES.policy);
      await expect(
        governancePage.getPolicyRow(GOV_TEST_RESOURCES.policy)
      ).toBeVisible();
    });

    // Polarion steps 3-4: Policy details show placement reference
    test('RHACM4K-64165: policy details page shows placement reference', async ({
      policyDetailsPage,
    }) => {
      await policyDetailsPage.goto(ns, GOV_TEST_RESOURCES.policy);
      await expect(policyDetailsPage.getPageHeading()).toContainText(
        GOV_TEST_RESOURCES.policy
      );

      const placementValue = policyDetailsPage.getDetailFieldValue(
        GOV_POLICY_DETAILS.fields.placement
      );
      await expect(placementValue).toContainText(GOV_TEST_RESOURCES.placement);
    });

    // Polarion steps 5-7: Click placement → navigate → verify governance references
    test('RHACM4K-64165: clicking placement navigates to placement details with governance references', async ({
      policyDetailsPage,
      placementDetailsPage,
      page,
    }) => {
      await policyDetailsPage.goto(ns, GOV_TEST_RESOURCES.policy);

      const placementLink = policyDetailsPage.getPlacementLink();
      await expect(placementLink).toBeVisible();
      await placementLink.click();

      await expect(page).toHaveURL(
        new RegExp(`placements/details/${ns}/${GOV_TEST_RESOURCES.placement}`)
      );

      await placementDetailsPage.waitForLoad(45_000);

      await expect(placementDetailsPage.getPageHeading()).toContainText(
        GOV_TEST_RESOURCES.placement
      );

      await expect(placementDetailsPage.getGovernanceHeading()).toBeVisible();

      await placementDetailsPage.verifyGovernanceReference(
        GOV_TEST_RESOURCES.policy,
        GOV_PLACEMENT_DETAILS.governance.types.policy
      );

      await placementDetailsPage.verifyGovernanceReference(
        GOV_TEST_RESOURCES.policySet,
        GOV_PLACEMENT_DETAILS.governance.types.policySet
      );
    });

    // Polarion steps 8-9: Policy set visible in list
    test('RHACM4K-64165: policy set appears on the policy sets list', async ({
      governancePage,
    }) => {
      await governancePage.goto();
      await governancePage.openPolicySetsTab();
      await expect(
        governancePage.getPolicySetCard(GOV_TEST_RESOURCES.policySet)
      ).toBeVisible();
    });

    // Polarion steps 10-12: Policy set panel shows placement, click navigates
    test('RHACM4K-64165: policy set details panel shows placement and navigates to placement details', async ({
      governancePage,
      policySetDetailsPage,
      page,
    }) => {
      await governancePage.goto();
      await governancePage.openPolicySetsTab();
      await governancePage.getPolicySetCard(GOV_TEST_RESOURCES.policySet).click();
      await policySetDetailsPage.waitForLoad(30_000);

      const panel = policySetDetailsPage.getDetailsPanel();
      await expect(panel).toBeVisible();
      await expect(panel).toContainText(GOV_TEST_RESOURCES.policySet);

      const placementLink = policySetDetailsPage.getPlacementLink(
        GOV_TEST_RESOURCES.placement
      );
      await expect(placementLink).toBeVisible();
      await placementLink.click();

      await expect(page).toHaveURL(
        new RegExp(`placements/details/${ns}/${GOV_TEST_RESOURCES.placement}`)
      );
    });
  }
);
