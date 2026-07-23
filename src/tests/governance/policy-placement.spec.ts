/* Copyright Contributors to the Open Cluster Management project */

/**
 * Governance: Policy Placement (RHACM4K-30491, RHACM4K-30492)
 *
 * Verifies policy creation wizard placement panel:
 *   - RHACM4K-30491: Create policy with new Placement (global cluster set + label predicates)
 *   - RHACM4K-30492: Create policy with existing Placement from another policy
 */

import { test, expect } from '@fixtures/governance-test';
import { GOV_POLICY_PLACEMENT_TEST_RESOURCES } from '@constants/governance';
import { cleanupPolicyResources } from '@lib/governance/policy-lifecycle';

const RES = GOV_POLICY_PLACEMENT_TEST_RESOURCES;
const POLICY_NAME_30491 = `${RES.policyPrefix}-e2e`;
const POLICY_NAME_30492 = `plc-30492-e2e`;
const PLACEMENT_NAME = `${POLICY_NAME_30491}-placement`;

async function waitForPoliciesTableAndSearch(
  governancePage: import('@pages/governance/GovernancePage').GovernancePage,
  governanceTable: import('@components/governance/GovernanceTable').GovernanceTable,
  page: import('@playwright/test').Page,
  searchTerm: string,
  timeoutMs = 120_000
): Promise<void> {
  const start = Date.now();
  const searchInput = page
    .getByLabel(/search input/i)
    .or(page.locator('#custom-advanced-search input').first());

  while (Date.now() - start < timeoutMs) {
    if (
      await searchInput
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false)
    ) {
      await governanceTable.search(searchTerm);
      return;
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await governancePage.openPoliciesTab();
  }
  await governanceTable.search(searchTerm);
}

async function createPolicyViaWizard(
  page: import('@playwright/test').Page,
  policiesListPage: import('@pages/governance/PoliciesListPage').PoliciesListPage,
  createPolicyWizardPage: import('@pages/governance/CreatePolicyWizardPage').CreatePolicyWizardPage,
  policyName: string,
  options: {
    existingPlacement?: string;
    clusterSet?: string;
    clusterBindingLabels?: Array<{ key: string; value: string }>;
  } = {}
): Promise<void> {
  await createPolicyWizardPage.openFromPoliciesList(policiesListPage);

  // Details step
  await createPolicyWizardPage.fillName(policyName);
  await createPolicyWizardPage.selectNamespace(RES.namespace);

  // Templates step
  await createPolicyWizardPage.advanceToNextStep();
  await createPolicyWizardPage.addPolicyTemplate('Namespace must exist');
  await createPolicyWizardPage.fillObjectDefinitionName('prod');
  await createPolicyWizardPage.setRemediation('Inform');

  // Placement step
  await createPolicyWizardPage.advanceToNextStep();

  if (options.existingPlacement) {
    await createPolicyWizardPage.ensureExistingPlacementSelected();
    await createPolicyWizardPage.selectExistingPlacement(options.existingPlacement);
  } else {
    await createPolicyWizardPage.ensureNewPlacementSelected();
    if (options.clusterSet) {
      await createPolicyWizardPage.selectClusterSet(options.clusterSet);
    }
    if (options.clusterBindingLabels) {
      for (const label of options.clusterBindingLabels) {
        await createPolicyWizardPage.addClusterBindingLabel(label.key, label.value);
      }
    }
  }

  // Annotations step — skip setting custom annotations, use defaults
  await createPolicyWizardPage.advanceToNextStep();

  // Review + Submit
  await createPolicyWizardPage.advanceToNextStep();
  await createPolicyWizardPage.submitPolicy();

  // After submit, the wizard navigates to the policy detail page once the
  // policy appears in the Recoil state — wait for the URL to leave /create.
  await expect(page).toHaveURL(/\/policies\/details\//, { timeout: 120_000 });
}

test.describe.serial('Test policy placement panel in Governance', { tag: ['@governance'] }, () => {
  test.beforeAll(async ({ oc }) => {
    for (const name of [POLICY_NAME_30491, POLICY_NAME_30492]) {
      await cleanupPolicyResources(oc, name, RES.namespace);
    }
  });

  test.afterAll(async ({ oc }) => {
    for (const name of [POLICY_NAME_30491, POLICY_NAME_30492]) {
      await cleanupPolicyResources(oc, name, RES.namespace);
    }
  });

  test('RHACM4K-30491: GRC: Test new placement panel in policy create wizard', async ({
    oc,
    policiesListPage,
    createPolicyWizardPage,
    governancePage,
    governanceTable,
    page,
  }) => {
    test.setTimeout(300_000);

    await createPolicyViaWizard(page, policiesListPage, createPolicyWizardPage, POLICY_NAME_30491, {
      clusterSet: RES.clusterSet,
      clusterBindingLabels: [{ key: 'vendor', value: 'OpenShift' }],
    });

    // Verify policy appears in listing
    await governancePage.goto();
    await governancePage.openPoliciesTab();
    await waitForPoliciesTableAndSearch(governancePage, governanceTable, page, POLICY_NAME_30491);
    await governanceTable.verifyPolicyInListing(POLICY_NAME_30491);

    // Verify PlacementBinding exists
    const pbCount = await oc.run(
      `oc -n ${RES.namespace} get placementbinding | grep ${POLICY_NAME_30491} | wc -l`
    );
    expect(pbCount.trim()).toBe('1');

    // Verify Placement exists
    const placementResult = await oc.run(
      `oc -n ${RES.namespace} get placement ${PLACEMENT_NAME} -o name`
    );
    expect(placementResult).toContain(
      `placement.cluster.open-cluster-management.io/${PLACEMENT_NAME}`
    );

    // Verify PlacementDecision exists
    const pdCount = await oc.run(
      `oc -n ${RES.namespace} get placementdecisions | grep ${POLICY_NAME_30491} | wc -l`
    );
    expect(pdCount.trim()).toBe('1');

    // Delete the policy
    await governanceTable.clickRowAction(POLICY_NAME_30491, 'Delete');
    await governanceTable.confirmActionModal('Delete');
    await governanceTable.verifyPolicyNotInListing(POLICY_NAME_30491);
  });

  test('RHACM4K-30492: GRC: Test existing placement panel in policy create wizard', async ({
    oc,
    policiesListPage,
    createPolicyWizardPage,
    governancePage,
    governanceTable,
    page,
  }) => {
    test.setTimeout(480_000);

    // First create a policy with new placement (same as 30491)
    await createPolicyViaWizard(page, policiesListPage, createPolicyWizardPage, POLICY_NAME_30491, {
      clusterSet: RES.clusterSet,
      clusterBindingLabels: [{ key: 'vendor', value: 'OpenShift' }],
    });

    // Verify first policy in listing
    await governancePage.goto();
    await governancePage.openPoliciesTab();
    await waitForPoliciesTableAndSearch(governancePage, governanceTable, page, POLICY_NAME_30491);
    await governanceTable.verifyPolicyInListing(POLICY_NAME_30491);

    // Create second policy using existing placement from first
    await createPolicyViaWizard(page, policiesListPage, createPolicyWizardPage, POLICY_NAME_30492, {
      existingPlacement: PLACEMENT_NAME,
    });

    // Verify second policy in listing
    await governancePage.goto();
    await governancePage.openPoliciesTab();
    await waitForPoliciesTableAndSearch(governancePage, governanceTable, page, POLICY_NAME_30492);
    await governanceTable.verifyPolicyInListing(POLICY_NAME_30492);

    // Verify PlacementBinding for second policy exists
    const pbCount = await oc.run(
      `oc -n ${RES.namespace} get placementbinding | grep ${POLICY_NAME_30492} | wc -l`
    );
    expect(pbCount.trim()).toBe('1');

    // Delete both policies
    await governanceTable.search(POLICY_NAME_30491);
    await expect(governanceTable.getRowByName(POLICY_NAME_30491)).toBeVisible({
      timeout: 30_000,
    });
    await governanceTable.clickRowAction(POLICY_NAME_30491, 'Delete');
    await governanceTable.confirmActionModal('Delete');

    await governanceTable.search(POLICY_NAME_30492);
    await expect(governanceTable.getRowByName(POLICY_NAME_30492)).toBeVisible({
      timeout: 30_000,
    });
    await governanceTable.clickRowAction(POLICY_NAME_30492, 'Delete');
    await governanceTable.confirmActionModal('Delete');
  });
});
