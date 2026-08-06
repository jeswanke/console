/**
 * Hosted cluster (AWS) — validate the CLI-based creation instructions wizard.
 *
 * AWS hosted clusters cannot be created via the UI — the wizard shows CLI instructions
 * for using the `hcp` CLI. This test validates the instruction content, not provisioning.
 * Migrated from: clc-ui-e2e/cypress/tests/hostedClusters/aws/awsHostedCluster.spec.js
 */
import { test, expect } from '@fixtures/acm-test';

test.describe('Hosted Cluster - AWS', { tag: ['@cluster', '@clc', '@hypershift', '@hosted'] }, () => {
  // TODO: PF6 selectable card (#hosted) click does not reliably navigate in headless Playwright.
  // Works in manual browser interaction. Needs investigation on new ACM hub build —
  // may be a React event handler timing issue with the PF6 card component.
  test.fixme();

  test(
    'RHACM4K-23962: AWS hosted cluster CLI instructions',
    { tag: ['@RHACM4K-23962'] },
    async ({ page, clusterListPage, createClusterWizardPage }) => {
      await test.step('Navigate to create wizard and select AWS', async () => {
        await clusterListPage.goto();
        await clusterListPage.clickCreate();
        await createClusterWizardPage.getProviderCard('aws').click();
      });

      await test.step('Verify control plane type selection page', async () => {
        await expect(
          page.getByRole('heading', { name: /Control plane type/ })
        ).toBeVisible({ timeout: 30_000 });
        await expect(
          page.getByRole('button', { name: 'Compare control plane types' })
        ).toBeVisible();
      });

      await test.step('Verify hosted card content', async () => {
        const hostedCard = createClusterWizardPage.getHostedCard();
        await expect(hostedCard).toBeVisible();
        await expect(hostedCard).not.toContainText(
          'Hosted control plane operator must be enabled in order to continue'
        );
        await expect(hostedCard).toContainText('Hosted');
        await expect(hostedCard).toContainText('CLI-based');
        await expect(hostedCard).toContainText(
          'Run an OpenShift cluster where the control plane is decoupled from the data plane'
        );
        await expect(hostedCard).toContainText(
          'Reduces costs by efficiently reusing an OpenShift cluster to host multiple control planes'
        );
        await expect(hostedCard).toContainText('Quickly provisions clusters');
      });

      await test.step('Click hosted card to view instructions', async () => {
        const hostedCard = createClusterWizardPage.getHostedCard();
        await hostedCard.scrollIntoViewIfNeeded();
        await hostedCard.click();
        await expect(
          page.getByText('Prerequisites and Configuration')
        ).toBeVisible({ timeout: 30_000 });
      });

      await test.step('Verify prerequisite step', async () => {
        const step1 = page.getByText('Prerequisites and Configuration').locator('..');
        await expect(step1).toBeVisible();
        await expect(step1).toContainText('Download and install the Hosted Control Plane CLI');
        await expect(step1.getByText('Follow documentation for more information.')).toBeVisible();
      });

      await test.step('Verify STS credential step', async () => {
        const step2 = page.getByText('Security Token Service (STS) credential').locator('..');
        await expect(step2).toBeVisible();
        await expect(step2).toContainText('This creates a STS credential JSON file');
      });

      await test.step('Verify IAM role step', async () => {
        const step3 = page.getByText('Identity and Access Management (IAM) role').locator('..');
        await expect(step3).toBeVisible();
        await expect(step3).toContainText('This creates a AWS IAM role');
      });

      await test.step('Verify pull secret step', async () => {
        const step4 = page.getByText('Red Hat OpenShift Container Platform pull secret').locator('..');
        await expect(step4).toBeVisible();
      });

      await test.step('Verify create command step', async () => {
        const step5 = page.getByText('Create the Hosted Control Plane').locator('..');
        await expect(step5).toBeVisible();
        await expect(step5.getByText('Log in to OpenShift Container Platform')).toBeVisible();
        await expect(step5.getByText('Run command')).toBeVisible();

        const codeBlock = page.locator('#code-content');
        await expect(codeBlock).toBeVisible();
        await expect(codeBlock).toContainText('hcp create cluster aws');
        await expect(codeBlock).toContainText('--name $CLUSTER_NAME');
        await expect(codeBlock).toContainText('--sts-creds $STS_CREDS');
        await expect(codeBlock).toContainText('--role-arn $ROLE_ARN');
        await expect(codeBlock).toContainText('--pull-secret $PULL_SECRET');
        await expect(codeBlock).toContainText('--region $REGION');
        await expect(codeBlock).toContainText('--base-domain $BASE_DOMAIN');
      });

      await test.step('Verify helper command', async () => {
        const helperCommand = page.locator('#helper-command');
        await expect(helperCommand).toBeVisible();
        await expect(helperCommand).toHaveText('hcp create cluster aws --help');
      });

      await test.step('Verify documentation link', async () => {
        await expect(page.getByRole('link', { name: 'View documentation' })).toBeVisible();
      });
    }
  );
});
