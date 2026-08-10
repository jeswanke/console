import fs from 'node:fs';
import path from 'node:path';

import { expect } from '@playwright/test';

import type { OcCliService } from '@services/OcCliService';

const GITOPS_NS = 'openshift-gitops';
const GITOPS_OPERATOR_NS = 'openshift-gitops-operator';
const AGENT_TEMPLATE_DIR = 'src/templates/app/argo/agent';

function agentTemplatePath(repoRoot: string, fileName: string): string {
  return path.join(repoRoot, AGENT_TEMPLATE_DIR, fileName);
}

function readAgentTemplate(repoRoot: string, fileName: string): string {
  return fs.readFileSync(agentTemplatePath(repoRoot, fileName), 'utf8');
}

async function applyYamlString(oc: OcCliService, yaml: string): Promise<void> {
  await oc.run(`oc apply -f - <<'EOF'\n${yaml}\nEOF`);
}

async function waitForPodRunning(
  oc: OcCliService,
  namespace: string,
  grepPattern: string,
  timeoutMs = 300_000
): Promise<void> {
  await expect
    .poll(
      async () => {
        const out = await oc.run(
          `oc get pod -n ${namespace} 2>/dev/null | grep ${grepPattern} || true`
        );
        return out.includes('Running');
      },
      { timeout: timeoutMs, intervals: [10_000] }
    )
    .toBe(true);
}

/** Cypress `before()` — uninstall stock GitOps addon and enable Argo CD Agent mode. */
export async function installArgoCdAgentMode(
  oc: OcCliService,
  managedClusterName: string,
  repoRoot: string
): Promise<void> {
  await oc.run(`oc delete gitopscluster --all -n ${GITOPS_NS} --ignore-not-found`);
  await oc.run(
    `oc delete managedclusteraddon gitops-addon -n ${managedClusterName} --ignore-not-found`
  );

  await oc.run(`oc delete cm -n ${GITOPS_NS} argocd-agent-ca-bundle --ignore-not-found`);
  await oc.run(
    `oc delete secret -n ${GITOPS_NS} argocd-agent-ca argocd-agent-jwt argocd-agent-principal-tls --ignore-not-found`
  );

  const patchPath = agentTemplatePath(repoRoot, 'gitops-operator-subscription-patch.json');
  await oc.run(
    `oc patch subscription.operators openshift-gitops-operator -n ${GITOPS_OPERATOR_NS} --type=merge --patch-file ${patchPath}`
  );

  await oc.run(`oc delete argocd openshift-gitops -n ${GITOPS_NS} --ignore-not-found`);
  await oc.applyYaml(agentTemplatePath(repoRoot, 'argocd-agent-cr.yaml'));
  await new Promise((resolve) => setTimeout(resolve, 60_000));

  const clusterYaml = readAgentTemplate(repoRoot, 'gitops-cluster-agent.yaml').replaceAll(
    'MANAGED_CLUSTER_NAME',
    managedClusterName
  );
  await applyYamlString(oc, clusterYaml);

  await waitForPodRunning(oc, GITOPS_NS, 'openshift-gitops-agent-principal');

  const prior = await oc.getCurrentContext();
  try {
    await oc.useContext(managedClusterName);
    await waitForPodRunning(oc, GITOPS_NS, 'argocd-agent-agent');
  } finally {
    await oc.useContext(prior);
  }
}

/** RHACM4K-59837: deploy test Application via agent server address/port from GitOpsCluster. */
export async function deployArgoCdAgentTestApplication(
  oc: OcCliService,
  managedClusterName: string,
  repoRoot: string
): Promise<void> {
  const prior = await oc.getCurrentContext();
  try {
    await oc.useContext(managedClusterName);
    await oc.createNamespaceIfNotExists('test-argocd-agent-app-ns');
  } finally {
    await oc.useContext(prior);
  }

  const serverAddress = (
    await oc.run(
      `oc get gitopscluster mc-gitops -n ${GITOPS_NS} -o jsonpath='{.spec.gitopsAddon.argoCDAgent.serverAddress}'`
    )
  ).trim();
  const serverPort = (
    await oc.run(
      `oc get gitopscluster mc-gitops -n ${GITOPS_NS} -o jsonpath='{.spec.gitopsAddon.argoCDAgent.serverPort}'`
    )
  ).trim();

  const appYaml = readAgentTemplate(repoRoot, 'test-argocd-agent-app.yaml')
    .replaceAll('MANAGED_CLUSTER_NAME', managedClusterName)
    .replaceAll('SERVER_ADDRESS', serverAddress)
    .replaceAll('SERVER_PORT', serverPort);

  await applyYamlString(oc, appYaml);
}

export async function waitForArgoCdAgentApplicationHealthy(
  oc: OcCliService,
  managedClusterName: string,
  appName = 'test-argocd-agent-app'
): Promise<void> {
  await expect
    .poll(
      async () =>
        (
          await oc.run(
            `oc get apps -n ${managedClusterName} ${appName} -o jsonpath='{.status.health.status}' 2>/dev/null || true`
          )
        ).trim(),
      { timeout: 180_000, intervals: [10_000] }
    )
    .toBe('Healthy');

  await expect
    .poll(
      async () =>
        (
          await oc.run(
            `oc get apps -n ${managedClusterName} ${appName} -o jsonpath='{.status.sync.status}' 2>/dev/null || true`
          )
        ).trim(),
      { timeout: 180_000, intervals: [10_000] }
    )
    .toBe('Synced');
}

export async function verifyArgoCdAgentManagedClusterResources(
  oc: OcCliService,
  managedClusterName: string,
  namespace = 'test-argocd-agent-app-ns'
): Promise<void> {
  const prior = await oc.getCurrentContext();
  try {
    await oc.useContext(managedClusterName);
    const out = await oc.run(`oc get service,deployment -n ${namespace} --no-headers`);
    expect(out).toContain('service/mortgage-app-svc');
    expect(out).toContain('deployment.apps/mortgage-app-deploy');
  } finally {
    await oc.useContext(prior);
  }
}

/** Cypress `after()` — restore stock Argo CD after agent test. */
export async function uninstallArgoCdAgentMode(
  oc: OcCliService,
  managedClusterName: string,
  repoRoot: string
): Promise<void> {
  await oc.run(`oc delete apps test-argocd-agent-app -n ${managedClusterName} --ignore-not-found`);

  const prior = await oc.getCurrentContext();
  try {
    await oc.useContext(managedClusterName);
    await oc.run(`oc delete ns test-argocd-agent-app-ns --ignore-not-found`);
  } finally {
    await oc.useContext(prior);
  }

  await oc.run(`oc delete gitopscluster --all -n ${GITOPS_NS} --ignore-not-found`);
  await oc.run(
    `oc delete managedclusteraddon gitops-addon -n ${managedClusterName} --ignore-not-found`
  );

  await oc.run(`oc delete argocd openshift-gitops -n ${GITOPS_NS} --ignore-not-found`);
  await oc.run(
    `oc delete secret -n ${GITOPS_NS} -l argocd.argoproj.io/secret-type=cluster --ignore-not-found`
  );
  await oc.applyYaml(agentTemplatePath(repoRoot, 'full-argocd.yaml'));
}
