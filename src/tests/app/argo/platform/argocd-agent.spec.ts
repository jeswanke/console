/**
 * RHACM4K-59837 — Argo CD Application deployment via Argo CD Agent.
 *
 * Cypress: `ArgoCD_Agent_Test_Suite.cy.js` (@non-ui; destructive GitOps reconfiguration).
 */
import {
  deployArgoCdAgentTestApplication,
  installArgoCdAgentMode,
  uninstallArgoCdAgentMode,
  verifyArgoCdAgentManagedClusterResources,
  waitForArgoCdAgentApplicationHealthy,
} from '@lib/app/setup/argocd-agent';
import { getRepoRoot } from '@lib/repo-root';
import { test } from '@fixtures/app-test';

const managedClusterName =
  process.env.E2E_MANAGED_CLUSTER_NAME?.trim() || 'local-cluster';

test.describe(
  'Application Lifecycle UI: ArgoCD Agent Test Suite',
  { tag: ['@gitops', '@argocd-agent', '@e2e-argo'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async ({ oc }) => {
      test.setTimeout(900_000);
      await installArgoCdAgentMode(oc, managedClusterName, getRepoRoot());
    });

    test.afterAll(async ({ oc }) => {
      await uninstallArgoCdAgentMode(oc, managedClusterName, getRepoRoot());
    });

    test(
      'RHACM4K-59837: ALC: Verify Argo CD application deployment succeeds using Argo CD Agent',
      { tag: ['@RHACM4K-59837', '@non-ui', '@e2e-common'] },
      async ({ oc }) => {
        test.setTimeout(600_000);
        await deployArgoCdAgentTestApplication(oc, managedClusterName, getRepoRoot());
        await waitForArgoCdAgentApplicationHealthy(oc, managedClusterName);
        await verifyArgoCdAgentManagedClusterResources(oc, managedClusterName);
      }
    );
  }
);
