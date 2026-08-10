import fs from 'node:fs';
import path from 'node:path';

import { expect } from '@playwright/test';

import type { ObjectStoreAuth, ObjectStoreTlsAuth } from '@lib/app/auth/object-store-auth';
import { withManagedClusterContext } from '@lib/cluster/managed-cluster-oc';
import type { OcCliService } from '@services/OcCliService';

const TEMPLATE_DIR = path.join(
  path.resolve(__dirname, '../../../..'),
  'src/templates/app/subscription-api'
);

type TemplateReplacements = Record<string, string>;

function renderTemplate(templateFileName: string, replacements: TemplateReplacements): string {
  let raw = fs.readFileSync(path.join(TEMPLATE_DIR, templateFileName), 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    raw = raw.replaceAll(key, value);
  }
  return raw;
}

async function applyRenderedYaml(oc: OcCliService, yaml: string): Promise<void> {
  await oc.run(`oc apply -f - <<'EOF'\n${yaml}\nEOF`);
}

export async function applyObjectMultiSubscriptionApiYaml(
  oc: OcCliService,
  managedClusterName: string,
  auth: ObjectStoreAuth
): Promise<void> {
  const yaml = renderTemplate('api-obj-multi.yaml', {
    '{CLUSTER_NAME}': managedClusterName,
    '{ACCESS_KEY}': auth.accessKeyBase64,
    '{SECRET_KEY}': auth.secretKeyBase64,
  });
  await applyRenderedYaml(oc, yaml);
}

export async function applyObjectAddSubscriptionYaml(oc: OcCliService): Promise<void> {
  const yaml = fs.readFileSync(path.join(TEMPLATE_DIR, 'obj-add.yaml'), 'utf8');
  await applyRenderedYaml(oc, yaml);
}

export async function applyObjectKustomizeAppYaml(
  oc: OcCliService,
  auth: ObjectStoreAuth
): Promise<void> {
  const pathname = auth.privateUrl.endsWith('/alc-kustomization-app')
    ? auth.privateUrl
    : `${auth.privateUrl.replace(/\/$/, '')}/alc-kustomization-app`;
  const yaml = renderTemplate('obj-kustomize-app.yaml', {
    '{ACCESS_KEY}': auth.accessKeyBase64,
    '{SECRET_KEY}': auth.secretKeyBase64,
    '{OBJECTSTORE_PATHNAME}': pathname,
  });
  await applyRenderedYaml(oc, yaml);
}

export async function applyObjectTlsSubscriptionYaml(
  oc: OcCliService,
  templateFileName: 'obj-tls-insecure.yaml' | 'obj-tls-correct.yaml' | 'obj-tls-incorrect.yaml',
  tlsAuth: ObjectStoreTlsAuth,
  managedClusterName?: string
): Promise<void> {
  const replacements: TemplateReplacements = {
    '<API_ROUTE>': tlsAuth.route,
    '<CONSOLE_ACCESS_KEY>': tlsAuth.accessKeyBase64,
    '<CONSOLE_SECRET_KEY>': tlsAuth.secretKeyBase64,
  };
  if (managedClusterName) {
    replacements['<Managed Cluster Name>'] = managedClusterName;
  }
  const yaml = renderTemplate(templateFileName, replacements);
  await applyRenderedYaml(oc, yaml);
}

export async function expectObjectApplicationApiResourcesReady(
  oc: OcCliService,
  applicationName: string,
  namespace: string
): Promise<void> {
  await expect
    .poll(
      async () => {
        const apps = await oc
          .getNamespacedResourceList('applications.app', namespace)
          .catch(() => '');
        return apps.includes(applicationName);
      },
      { timeout: 180_000, intervals: [5_000, 10_000] }
    )
    .toBe(true);

  await expect
    .poll(
      async () => {
        const subs = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
        return subs.includes(`${applicationName}-subscription-1`);
      },
      { timeout: 180_000, intervals: [5_000, 10_000] }
    )
    .toBe(true);

  await expect
    .poll(
      async () => {
        const placements = await oc
          .getNamespacedResourceList('placement', namespace)
          .catch(() => '');
        return placements.includes(`${applicationName}-placement-1`);
      },
      { timeout: 180_000, intervals: [5_000, 10_000] }
    )
    .toBe(true);
}

export async function expectAppsubPhase(
  oc: OcCliService,
  namespace: string,
  appsubName: string,
  phase: string,
  timeoutMs = 300_000
): Promise<void> {
  await expect
    .poll(
      async () => {
        const out = await oc.run(
          `oc get appsub -n ${namespace} ${appsubName} -o jsonpath='{.status.phase}' 2>/dev/null || true`
        );
        return out.trim();
      },
      { timeout: timeoutMs, intervals: [5_000, 10_000] }
    )
    .toBe(phase);
}

export async function expectHelloworldDeployablesInNamespace(
  oc: OcCliService,
  namespace: string
): Promise<void> {
  for (const kind of ['deployment', 'service', 'route'] as const) {
    await expect
      .poll(
        async () => {
          const out = await oc.run(
            `oc get ${kind} -n ${namespace} --no-headers 2>/dev/null || true`
          );
          return (
            out.includes('helloworld-app-deploy') ||
            out.includes('helloworld-app-svc') ||
            out.includes('helloworld-app-route')
          );
        },
        { timeout: 180_000, intervals: [5_000, 10_000] }
      )
      .toBe(true);
  }
}

export async function expectObjectTlsHelloworldReadyOnHubAndManaged(
  oc: OcCliService,
  managedClusterName: string,
  namespace: string,
  remoteAppsubName: string
): Promise<void> {
  const localAppsubName = `${remoteAppsubName}-local`;
  await expectAppsubPhase(oc, namespace, remoteAppsubName, 'Propagated');
  await expectAppsubPhase(oc, namespace, localAppsubName, 'Subscribed');
  await expectHelloworldDeployablesInNamespace(oc, namespace);

  await withManagedClusterContext(oc, managedClusterName, async () => {
    await expectAppsubPhase(oc, namespace, remoteAppsubName, 'Subscribed');
    await expectHelloworldDeployablesInNamespace(oc, namespace);
  });
}

export async function expectObjectTlsBadCertPropagationFailed(
  oc: OcCliService,
  namespace: string,
  appsubName: string
): Promise<void> {
  await expectAppsubPhase(oc, namespace, appsubName, 'PropagationFailed');
  await expect
    .poll(
      async () => {
        const reason = await oc.run(
          `oc get appsub -n ${namespace} ${appsubName} -o jsonpath='{.status.reason}' 2>/dev/null || true`
        );
        return reason.includes(
          'tls: failed to verify certificate: x509: certificate signed by unknown authority'
        );
      },
      { timeout: 180_000, intervals: [5_000, 10_000] }
    )
    .toBe(true);
}

export async function expectObjectKustomizeResourcesReady(
  oc: OcCliService,
  appNamespace: string,
  resourcesNamespace: string
): Promise<void> {
  await expectAppsubPhase(oc, appNamespace, 'obj-kustomize-app-subscription-1', 'Propagated');
  await expectAppsubPhase(oc, appNamespace, 'obj-kustomize-app-subscription-1-local', 'Subscribed');

  const emptyNs = await oc.run(
    `oc get pvc,deployment,service -n ${appNamespace} 2>/dev/null || true`
  );
  expect(emptyNs).toContain('No resources found');

  await expect
    .poll(
      async () => {
        const out = await oc.run(
          `oc get pvc -n ${resourcesNamespace} --no-headers 2>/dev/null || true`
        );
        return out.includes('example-data-claim');
      },
      { timeout: 300_000, intervals: [5_000, 10_000] }
    )
    .toBe(true);

  for (const [kind, name] of [
    ['deployment', 'example'],
    ['service', 'example'],
  ] as const) {
    await expect
      .poll(
        async () => {
          const out = await oc.run(
            `oc get ${kind} -n ${resourcesNamespace} --no-headers 2>/dev/null || true`
          );
          return out.includes(name);
        },
        { timeout: 300_000, intervals: [5_000, 10_000] }
      )
      .toBe(true);
  }
}

export async function deleteObjectMultiApiSubscription(
  oc: OcCliService,
  applicationName: string,
  namespace: string,
  subscriptionIndex: 1 | 2 | 3
): Promise<void> {
  await oc.run(
    `oc delete subscription ${applicationName}-subscription-${subscriptionIndex} -n ${namespace} --ignore-not-found`
  );
  const subs = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
  expect(subs).not.toContain(`${applicationName}-subscription-${subscriptionIndex}`);
}

export async function deleteObjectMultiApplicationViaOc(
  oc: OcCliService,
  applicationName: string,
  namespace: string
): Promise<void> {
  await oc.run(
    `oc delete application.app ${applicationName} -n ${namespace} --ignore-not-found; ` +
      `oc delete subscription ${applicationName}-subscription-1 -n ${namespace} --ignore-not-found; ` +
      `oc delete placement ${applicationName}-placement-1 -n ${namespace} --ignore-not-found; ` +
      `oc delete subscription ${applicationName}-subscription-2 -n ${namespace} --ignore-not-found; ` +
      `oc delete placement ${applicationName}-placement-2 -n ${namespace} --ignore-not-found`
  );
  const subs = await oc.getNamespacedResourceList('subscription', namespace).catch(() => '');
  expect(subs.trim()).toBe('');
  const placements = await oc.getNamespacedResourceList('placement', namespace).catch(() => '');
  expect(placements.trim()).toBe('');
  await oc.deleteNamespace(namespace).catch(() => undefined);
}

export async function expectManagedClusterRouteReady(
  oc: OcCliService,
  managedClusterName: string,
  namespace: string,
  routeName: string
): Promise<void> {
  await withManagedClusterContext(oc, managedClusterName, async () => {
    await expect
      .poll(
        async () => {
          const out = await oc.run(`oc get route -n ${namespace} --no-headers 2>/dev/null || true`);
          return out.includes(routeName);
        },
        { timeout: 300_000, intervals: [5_000, 10_000] }
      )
      .toBe(true);
  });
}

export async function expectNamespaceDeployableResources(
  oc: OcCliService,
  namespace: string,
  resourceStem: string
): Promise<void> {
  for (const kind of ['service', 'deployment', 'replicaset', 'pod'] as const) {
    await expect
      .poll(
        async () => {
          const out = await oc.run(
            `oc get ${kind} -n ${namespace} --no-headers 2>/dev/null || true`
          );
          return out.includes(resourceStem);
        },
        { timeout: 300_000, intervals: [5_000, 10_000] }
      )
      .toBe(true);
  }
}
