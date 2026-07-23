/* Copyright Contributors to the Open Cluster Management project */

/**
 * Governance: Namespace Label Selector (RHACM4K-14942)
 *
 * Verifies policy creation wizard namespace label selector:
 *   - Creates a policy with namespace label selector (matchExpressions)
 *   - Verifies pod "not found" in the target namespace
 *   - Enforces policy, waits for compliance
 *   - Deletes and cleans up
 */

import path from 'path';
import { test, expect } from '@fixtures/governance-test';
import { OcCliService } from '@services/OcCliService';
import { GOV_NS_LABELSELECTOR_TEST_RESOURCES } from '@constants/governance';
import { waitForPolicyStatus, waitForAnyClusterCompliant } from '@lib/governance/policy-lifecycle';

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/governance');
const SETUP_NS_YAML = path.join(TEMPLATES_DIR, 'ns-labelselector-create-ns.yaml');

const SETUP_POLICY_NAME = 'setup-ns-14942-e2e';
const RES = GOV_NS_LABELSELECTOR_TEST_RESOURCES;
const POLICY_NAME = `${RES.policyPrefix}-e2e`;
const TEMPLATE_NAME = `${POLICY_NAME}-nginx-pod`;
const POD_NAME = 'test-pod-14942';
const TARGET_NS = RES.targetNamespace;

async function deleteSetupPolicy(oc: OcCliService): Promise<void> {
  await oc
    .run(
      `oc delete policy ${SETUP_POLICY_NAME} -n default --ignore-not-found=true && ` +
        `oc delete placementbinding binding-${SETUP_POLICY_NAME} -n default --ignore-not-found=true && ` +
        `oc delete placement ${SETUP_POLICY_NAME}-placement -n default --ignore-not-found=true`
    )
    .catch(() => undefined);
}

test.describe.serial(
  'RHACM4K-14942: GRC: UI: GRC Policy namespace selection should support labels',
  { tag: ['@governance'] },
  () => {
    test.beforeAll(async ({ oc }) => {
      test.setTimeout(300_000);

      // Cleanup any leftover resources from previous runs
      const placementName = `${POLICY_NAME}-placement`;
      await oc
        .run(
          `oc delete policy ${POLICY_NAME} -n ${RES.namespace} --ignore-not-found=true && ` +
            `oc delete placementbinding ${placementName} -n ${RES.namespace} --ignore-not-found=true && ` +
            `oc delete placement ${placementName} -n ${RES.namespace} --ignore-not-found=true`
        )
        .catch(() => undefined);
      await deleteSetupPolicy(oc);

      // Create the target namespace on managed clusters via an enforced ACM policy.
      // This propagates the namespace (with the required label) to all clusters
      // that have the config-policy-controller addon available.
      await oc.applyYaml(SETUP_NS_YAML);
      await waitForPolicyStatus(oc, 'default', SETUP_POLICY_NAME, 'Compliant', 180_000);

      // Remove the setup policy — the namespaces persist on managed clusters
      await deleteSetupPolicy(oc);
    });

    test.afterAll(async ({ oc }) => {
      test.setTimeout(180_000);

      // Delete the test policy and placement resources
      const placementName = `${POLICY_NAME}-placement`;
      await oc
        .run(
          `oc delete policy ${POLICY_NAME} -n ${RES.namespace} --ignore-not-found=true && ` +
            `oc delete placementbinding ${placementName} -n ${RES.namespace} --ignore-not-found=true && ` +
            `oc delete placement ${placementName} -n ${RES.namespace} --ignore-not-found=true`
        )
        .catch(() => undefined);

      // Cleanup any leftover setup policy
      await deleteSetupPolicy(oc);

      // Delete the target namespace on the hub (managed cluster namespaces
      // will be cleaned up by subsequent test runs or cluster lifecycle)
      await oc
        .run(`oc delete namespace ${TARGET_NS} --ignore-not-found=true`)
        .catch(() => undefined);
    });

    test('RHACM4K-14942: GRC: Test Policy namespace label selector from UI', async ({
      oc,
      policiesListPage,
      createPolicyWizardPage,
      governancePage,
      governanceTable,
      policyDetailsPage,
      page,
    }) => {
      test.setTimeout(480_000);

      // Open create policy wizard
      await createPolicyWizardPage.openFromPoliciesList(policiesListPage);

      // Details step
      await createPolicyWizardPage.fillName(POLICY_NAME);
      await createPolicyWizardPage.selectNamespace(RES.namespace);

      // Templates step
      await createPolicyWizardPage.advanceToNextStep();
      await createPolicyWizardPage.addPolicyTemplate('Pod must exist');

      // Fill template fields
      await createPolicyWizardPage.fillConfigurationPolicyName(TEMPLATE_NAME);
      await createPolicyWizardPage.fillObjectDefinitionName(POD_NAME);
      await createPolicyWizardPage.setIncludeNamespace('auto-policy-test-*');

      // Namespace label selector matchExpressions
      await createPolicyWizardPage.addNamespaceLabelExpression('name', TARGET_NS);

      // Remediation = Inform
      await createPolicyWizardPage.setRemediation('Inform');

      // Placement step
      await createPolicyWizardPage.advanceToNextStep();
      await createPolicyWizardPage.ensureNewPlacementSelected();
      await createPolicyWizardPage.addClusterBindingLabel(
        'feature.open-cluster-management.io/addon-config-policy-controller',
        'available'
      );
      await createPolicyWizardPage.addClusterBindingLabel(
        'feature.open-cluster-management.io/addon-governance-policy-framework',
        'available'
      );

      // Annotations step
      await createPolicyWizardPage.advanceToNextStep();
      await createPolicyWizardPage.setAnnotation('#standards', ['NIST-CSF']);
      await createPolicyWizardPage.setAnnotation('#categories', ['PR.PT Protective Technology']);
      await createPolicyWizardPage.setAnnotation('#controls', ['PR.PT-3 Least Functionality']);

      // Review + Submit
      await createPolicyWizardPage.advanceToNextStep();
      await createPolicyWizardPage.submitPolicy();
      await expect(page).toHaveURL(/\/policies\/details\//, { timeout: 120_000 });

      // Wait for policy status to become available
      await waitForPolicyStatus(oc, RES.namespace, POLICY_NAME);

      // Navigate to policy details and verify template shows "not found" message
      await policyDetailsPage.goto(RES.namespace, POLICY_NAME);
      await policyDetailsPage.getResultsTab().click();
      await policyDetailsPage.waitForLoad(30_000);

      const expectedMsg = `pods [${POD_NAME}] not found in namespace ${TARGET_NS}`;
      await expect(
        page.locator('td[data-label="Message"]').filter({ hasText: expectedMsg }).first()
      ).toBeVisible({ timeout: 60_000 });

      // Enforce the policy
      await governancePage.goto();
      await governancePage.openPoliciesTab();
      await governanceTable.search(POLICY_NAME);
      await expect(governanceTable.getRowByName(POLICY_NAME)).toBeVisible({ timeout: 30_000 });
      await governanceTable.clickRowAction(POLICY_NAME, 'Enforce');
      await governanceTable.confirmActionModal('Enforce');

      // Wait for at least one cluster to become compliant (not all clusters
      // may have the target namespace, so the aggregate status may stay NonCompliant)
      await waitForAnyClusterCompliant(oc, RES.namespace, POLICY_NAME, 180_000);

      // Delete the policy
      await governanceTable.search(POLICY_NAME);
      await expect(governanceTable.getRowByName(POLICY_NAME)).toBeVisible({ timeout: 30_000 });
      await governanceTable.clickRowAction(POLICY_NAME, 'Delete');
      await governanceTable.confirmActionModal('Delete');
      await governanceTable.verifyPolicyNotInListing(POLICY_NAME);
    });
  }
);
