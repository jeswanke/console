import { exec, execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

type PlacementJson = {
  spec?: {
    clusterSets?: string[];
    predicates?: {
      requiredClusterSelector?: {
        labelSelector?: {
          matchExpressions?: { key?: string; operator?: string; values?: string[] }[];
        };
      };
    }[];
  };
};

type PlacementDecisionJson = {
  status?: {
    numberOfClusters?: number;
    decisions?: unknown[];
  };
};

type SubscriptionJson = {
  spec?: {
    placement?: {
      placementRef?: { kind?: string; name?: string };
    };
  };
};

/** Minimal validation so `applicationName` / `namespace` are safe as `oc` argv (no shell). */
function assertSafeOcSingleArg(value: string, field: string): void {
  const v = value.trim();
  if (!v || v.length > 253 || /[^a-zA-Z0-9.-]/.test(v)) {
    throw new Error(`OcCliService: invalid ${field} for oc argv (${JSON.stringify(value)})`);
  }
}

/** `oc config use-context` names (ManagedCluster names from merged kubeconfig). */
function assertSafeOcContextName(value: string, field: string): void {
  const v = value.trim();
  if (!v || v.length > 253 || !/^[a-zA-Z0-9._-]+$/.test(v)) {
    throw new Error(`OcCliService: invalid ${field} for oc context (${JSON.stringify(value)})`);
  }
}

/** Short resource kinds / API groups for `oc get <resource> -n …` (no shell metacharacters). */
function assertSafeOcResourceKind(value: string, field: string): void {
  const v = value.trim();
  if (!v || v.length > 200 || !/^[a-zA-Z0-9.]+$/.test(v)) {
    throw new Error(`OcCliService: invalid ${field} for oc argv (${JSON.stringify(value)})`);
  }
}

/**
 * Service for executing OpenShift CLI (oc) commands.
 */
export class OcCliService {
  async run(cmd: string): Promise<string> {
    try {
      const { stdout } = await execPromise(cmd);
      return stdout.trim();
    } catch (error) {
      console.error(`Error executing command: ${cmd}`, error);
      throw error;
    }
  }

  async applyYaml(yamlPath: string): Promise<string> {
    return this.run(`oc apply -f ${yamlPath}`);
  }

  async deleteYaml(yamlPath: string): Promise<string> {
    return this.run(`oc delete -f ${yamlPath} --ignore-not-found`);
  }

  async getConsoleUrl(): Promise<string> {
    const host = await this.run(
      'oc get route console -n openshift-console -o jsonpath="{.spec.host}"'
    );
    return `https://${host}`;
  }

  /**
   * Returns true if at least one instance of the resource exists in any namespace.
   * @param resource - e.g. "subscriptions.apps.open-cluster-management.io"
   */
  async hasResourcesInCluster(resource: string): Promise<boolean> {
    try {
      const out = await this.run(`oc get ${resource} -A --no-headers 2>/dev/null || true`);
      return out.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Whether an **Application** (`applications.app.k8s.io`) already exists in the namespace.
   * Matches the primary resource created from **Create application → Subscription** (application name + namespace).
   */
  async applicationsAppK8sIoExists(namespace: string, applicationName: string): Promise<boolean> {
    assertSafeOcSingleArg(namespace, 'namespace');
    assertSafeOcSingleArg(applicationName, 'applicationName');
    try {
      const { stdout } = await execFilePromise(
        'oc',
        [
          'get',
          'applications.app.k8s.io',
          applicationName,
          '-n',
          namespace,
          '--ignore-not-found',
          '-o',
          'name',
        ],
        { encoding: 'utf8', maxBuffer: 1024 * 1024 }
      );
      return stdout.trim().length > 0;
    } catch (err: unknown) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err ? String((err as { stderr?: unknown }).stderr) : '';
      if (/NotFound|not found/i.test(stderr)) {
        return false;
      }
      throw err;
    }
  }

  /** Whether an **ApplicationSet** exists in the Argo server namespace (push / pull model create). */
  async applicationSetExists(namespace: string, applicationSetName: string): Promise<boolean> {
    assertSafeOcSingleArg(namespace, 'namespace');
    assertSafeOcSingleArg(applicationSetName, 'applicationSetName');
    try {
      const { stdout } = await execFilePromise(
        'oc',
        [
          'get',
          'applicationset.argoproj.io',
          applicationSetName,
          '-n',
          namespace,
          '--ignore-not-found',
          '-o',
          'name',
        ],
        { encoding: 'utf8', maxBuffer: 1024 * 1024 }
      );
      return stdout.trim().length > 0;
    } catch (err: unknown) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err ? String((err as { stderr?: unknown }).stderr) : '';
      if (/NotFound|not found/i.test(stderr)) {
        return false;
      }
      throw err;
    }
  }

  async deleteApplicationSet(namespace: string, applicationSetName: string): Promise<void> {
    assertSafeOcSingleArg(namespace, 'namespace');
    assertSafeOcSingleArg(applicationSetName, 'applicationSetName');
    await execFilePromise(
      'oc',
      ['delete', 'applicationset.argoproj.io', applicationSetName, '-n', namespace, '--ignore-not-found'],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
  }

  /**
   * `oc label managedcluster <name> <key>=<value> --overwrite` (argv-only, no shell).
   */
  async labelManagedCluster(
    clusterName: string,
    labelKey: string,
    labelValue: string
  ): Promise<void> {
    assertSafeOcContextName(clusterName, 'clusterName');
    assertSafeOcSingleArg(labelValue, 'labelValue');
    const safeClusterName = clusterName.trim();
    const safeLabelKey = labelKey.trim();
    const safeLabelValue = labelValue.trim();
    if (!/^[a-zA-Z0-9._/-]+$/.test(safeLabelKey) || safeLabelKey.length > 253) {
      throw new Error(`OcCliService: invalid labelKey for oc argv (${JSON.stringify(safeLabelKey)})`);
    }
    await execFilePromise(
      'oc',
      ['label', 'managedcluster', safeClusterName, `${safeLabelKey}=${safeLabelValue}`, '--overwrite'],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
  }

  async deleteSecret(
    namespace: string,
    secretName: string,
    options?: { ignoreNotFound?: boolean }
  ): Promise<void> {
    assertSafeOcSingleArg(namespace, 'namespace');
    assertSafeOcSingleArg(secretName, 'secretName');
    const safeNamespace = namespace.trim();
    const safeSecretName = secretName.trim();
    const args = ['delete', 'secret', safeSecretName, '-n', safeNamespace];
    if (options?.ignoreNotFound) {
      args.push('--ignore-not-found');
    }
    await execFilePromise('oc', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  }

  private async deleteNamespacedResource(
    resource: string,
    namespace: string,
    name: string
  ): Promise<void> {
    assertSafeOcResourceKind(resource, 'resource');
    assertSafeOcSingleArg(namespace, 'namespace');
    assertSafeOcSingleArg(name, 'name');
    await execFilePromise(
      'oc',
      ['delete', resource, name, '-n', namespace, '--ignore-not-found'],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
  }

  private async listNamespacedResourceNames(resource: string, namespace: string): Promise<string[]> {
    assertSafeOcResourceKind(resource, 'resource');
    assertSafeOcSingleArg(namespace, 'namespace');
    try {
      const { stdout } = await execFilePromise(
        'oc',
        ['get', resource, '-n', namespace, '-o', 'jsonpath={.items[*].metadata.name}'],
        { encoding: 'utf8', maxBuffer: 1024 * 1024 }
      );
      return stdout.trim().split(/\s+/).filter(Boolean);
    } catch (err: unknown) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err ? String((err as { stderr?: unknown }).stderr) : '';
      if (/NotFound|not found|No resources found/i.test(stderr)) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Push-model / subscription **Placement** CRs for an app live in the Argo server namespace on the hub
   * (e.g. `openshift-gitops`), not on managed clusters. Skips shared prep placements such as `gitops-placement`.
   */
  async deleteApplicationPlacementsInNamespace(
    namespace: string,
    applicationName: string
  ): Promise<void> {
    const placementPrefix = `${applicationName}-placement`;
    const placementNames = (await this.listNamespacedResourceNames('placement', namespace)).filter(
      (name) => name === applicationName || name.startsWith(placementPrefix)
    );
    for (const placementName of placementNames) {
      await this.deleteNamespacedResource('placementdecision', namespace, `${placementName}-decision-1`);
      await this.deleteNamespacedResource('placement', namespace, placementName);
    }
  }

  /**
   * `oc delete namespace` on the hub — use after UI **Delete application** when e2e should drop the app namespace
   * entirely (`--ignore-not-found`, `--wait=true`).
   */
  async deleteNamespace(namespace: string): Promise<void> {
    assertSafeOcSingleArg(namespace, 'namespace');
    await execFilePromise(
      'oc',
      ['delete', 'namespace', namespace, '--ignore-not-found', '--wait=true'],
      { encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 600_000 }
    );
  }

  async getCurrentContext(): Promise<string> {
    const { stdout } = await execFilePromise(
      'oc',
      ['config', 'current-context'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 }
    );
    return stdout.trim();
  }

  async useContext(context: string): Promise<void> {
    assertSafeOcContextName(context, 'context');
    await execFilePromise(
      'oc',
      ['config', 'use-context', context],
      { encoding: 'utf8', maxBuffer: 64 * 1024 }
    );
  }

  /** Managed cluster names labeled with `cluster.open-cluster-management.io/clusterset=<clusterSet>`. */
  async listManagedClusterNamesInClusterSet(clusterSet: string): Promise<string[]> {
    const set = clusterSet.trim();
    if (!set || set.length > 63 || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(set)) {
      throw new Error(`OcCliService: invalid clusterSet (${JSON.stringify(clusterSet)})`);
    }
    const { stdout } = await execFilePromise(
      'oc',
      [
        'get',
        'managedclusters',
        '-l',
        `cluster.open-cluster-management.io/clusterset=${set}`,
        '-o',
        'jsonpath={.items[*].metadata.name}',
      ],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
    return stdout.trim().split(/\s+/).filter(Boolean);
  }

  /**
   * Deletes a namespace on each spoke (`oc config use-context` per cluster), then restores the prior context.
   * Requires merged kubeconfig from cluster prep (context names match ManagedCluster names).
   */
  async deleteNamespaceOnManagedClusters(
    namespace: string,
    managedClusterNames: string[]
  ): Promise<void> {
    if (managedClusterNames.length === 0) {
      return;
    }
    const priorContext = await this.getCurrentContext();
    try {
      for (const clusterName of managedClusterNames) {
        try {
          await this.useContext(clusterName);
          await this.deleteNamespace(namespace);
        } catch (err) {
          console.warn(
            `OcCliService: skip delete namespace "${namespace}" on managed cluster "${clusterName}":`,
            err
          );
        }
      }
    } finally {
      await this.useContext(priorContext);
    }
  }

  /**
   * `oc get <resource> -n <namespace>` — stdout for assertions / polling (argv-only, no shell).
   * @param resource - e.g. `subscription`, `deployment`, `applications.app`
   */
  async getNamespacedResourceList(resource: string, namespace: string): Promise<string> {
    assertSafeOcResourceKind(resource, 'resource');
    assertSafeOcSingleArg(namespace, 'namespace');
    const { stdout } = await execFilePromise(
      'oc',
      ['get', resource, '-n', namespace],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
    return stdout.trim();
  }

  /**
   * Idempotent **ManagedClusterSetBinding** so PlacementDecision can match clusters
   * in the application namespace when using `clusterSets: [global]`.
   */
  async ensureManagedClusterSetBinding(namespace: string, clusterSet: string): Promise<void> {
    assertSafeOcSingleArg(namespace, 'namespace');
    const set = clusterSet.trim();
    if (!set || set.length > 63 || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(set)) {
      throw new Error(`OcCliService: invalid clusterSet (${JSON.stringify(clusterSet)})`);
    }
    const manifest = [
      'apiVersion: cluster.open-cluster-management.io/v1beta2',
      'kind: ManagedClusterSetBinding',
      'metadata:',
      `  name: ${set}`,
      `  namespace: ${namespace}`,
      'spec:',
      `  clusterSet: ${set}`,
      '',
    ].join('\n');
    await this.applyManifestFromStdin(manifest);
  }

  private applyManifestFromStdin(manifest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('oc', ['apply', '-f', '-'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(stderr.trim() || `oc apply -f - exited with code ${code}`));
      });
      child.stdin.write(manifest);
      child.stdin.end();
    });
  }

  /** `spec.clusterSets` on a **Placement** CR. */
  async getPlacementClusterSets(namespace: string, placementName: string): Promise<string[]> {
    const placement = await this.getPlacementJson(namespace, placementName);
    return placement.spec?.clusterSets ?? [];
  }

  /**
   * Label selector **values** for `labelKey` from the first predicate's `matchExpressions` entry.
   */
  async getPlacementLabelSelectorValues(
    namespace: string,
    placementName: string,
    labelKey: string
  ): Promise<string[]> {
    const placement = await this.getPlacementJson(namespace, placementName);
    const expressions =
      placement.spec?.predicates?.[0]?.requiredClusterSelector?.labelSelector?.matchExpressions ?? [];
    const match = expressions.find((e) => e.key === labelKey);
    return match?.values ?? [];
  }

  /**
   * **Placement** name from `subscription.spec.placement.placementRef` (wizard edit may create `placement-3`, etc.).
   */
  async getSubscriptionPlacementRefName(
    namespace: string,
    subscriptionName: string
  ): Promise<string | undefined> {
    assertSafeOcSingleArg(namespace, 'namespace');
    assertSafeOcSingleArg(subscriptionName, 'subscriptionName');
    try {
      const { stdout } = await execFilePromise(
        'oc',
        ['get', 'subscription', subscriptionName, '-n', namespace, '-o', 'json'],
        { encoding: 'utf8', maxBuffer: 1024 * 1024 }
      );
      const parsed = JSON.parse(stdout) as SubscriptionJson;
      return parsed.spec?.placement?.placementRef?.name?.trim() || undefined;
    } catch (err: unknown) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err ? String((err as { stderr?: unknown }).stderr) : '';
      if (/NotFound|not found/i.test(stderr)) {
        return undefined;
      }
      throw err;
    }
  }

  /**
   * Matched cluster count from **PlacementDecision** status (`{placementName}-decision-1`).
   */
  async getPlacementDecisionClusterCount(
    namespace: string,
    placementName: string
  ): Promise<number> {
    assertSafeOcSingleArg(namespace, 'namespace');
    assertSafeOcSingleArg(placementName, 'placementName');
    const decisionName = `${placementName}-decision-1`;
    try {
      const { stdout } = await execFilePromise(
        'oc',
        ['get', 'placementdecision', decisionName, '-n', namespace, '-o', 'json'],
        { encoding: 'utf8', maxBuffer: 1024 * 1024 }
      );
      const parsed = JSON.parse(stdout) as PlacementDecisionJson;
      if (typeof parsed.status?.numberOfClusters === 'number') {
        return parsed.status.numberOfClusters;
      }
      return parsed.status?.decisions?.length ?? 0;
    } catch (err: unknown) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err ? String((err as { stderr?: unknown }).stderr) : '';
      if (/NotFound|not found/i.test(stderr)) {
        return 0;
      }
      throw err;
    }
  }

  private async getPlacementJson(namespace: string, placementName: string): Promise<PlacementJson> {
    assertSafeOcSingleArg(namespace, 'namespace');
    assertSafeOcSingleArg(placementName, 'placementName');
    const { stdout } = await execFilePromise(
      'oc',
      ['get', 'placement', placementName, '-n', namespace, '-o', 'json'],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 }
    );
    return JSON.parse(stdout) as PlacementJson;
  }

  // ---------------------------------------------------------------------------
  // MCRA (MulticlusterRoleAssignment) operations
  // ---------------------------------------------------------------------------

  async mcraGetAll(labelSelector?: string): Promise<Record<string, unknown>[]> {
    const labelFlag = labelSelector ? ` -l "${labelSelector}"` : '';
    const output = await this.run(
      `oc get multiclusterroleassignment -A${labelFlag} -o json`
    );
    const parsed = JSON.parse(output);
    return parsed.items || [];
  }

  async mcraDeleteByName(name: string, namespace: string): Promise<string> {
    return this.run(
      `oc delete multiclusterroleassignment ${name} -n ${namespace} --ignore-not-found`
    );
  }

  async mcraGetForUser(username: string): Promise<Record<string, unknown>[]> {
    const items = await this.mcraGetAll();
    return items.filter((m) => {
      const spec = m.spec as Record<string, unknown> | undefined;
      const subject = spec?.subject as Record<string, unknown> | undefined;
      return subject?.name === username;
    });
  }

  async mcraGetRolesForUser(username: string): Promise<string[]> {
    const items = await this.mcraGetForUser(username);
    return items.flatMap((m) => {
      const spec = m.spec as Record<string, unknown> | undefined;
      const ra = spec?.roleAssignments as Record<string, unknown>[] | undefined;
      return (ra || []).map((r) => r.clusterRole as string);
    });
  }

  async mcraDeleteAllForUser(username: string): Promise<void> {
    try {
      const items = await this.mcraGetForUser(username);
      for (const item of items) {
        const metadata = item.metadata as Record<string, unknown> | undefined;
        if (metadata?.name && metadata?.namespace) {
          await this.mcraDeleteByName(
            metadata.name as string,
            metadata.namespace as string
          );
        }
      }
    } catch {
      // Best-effort cleanup
    }
  }

  // ---------------------------------------------------------------------------
  // VM (VirtualMachine) operations
  // ---------------------------------------------------------------------------

  /**
   * Ensure a lightweight test VM exists and is running.
   * Uses cirros container disk (no PVC needed, starts in seconds).
   * Idempotent: skips creation if VM already exists.
   */
  async vmEnsureTestVM(
    name: string,
    namespace: string,
    labels?: Record<string, string>
  ): Promise<string> {
    const exists = await this.run(
      `oc get vm ${name} -n ${namespace} --no-headers 2>/dev/null || true`
    );
    if (exists.includes(name)) {
      return name;
    }

    const labelEntries = { 'e2e-test': 'true', ...labels };
    const labelYaml = Object.entries(labelEntries)
      .map(([k, v]) => `      ${k}: "${v}"`)
      .join('\n');

    await this.run(`oc apply -f - <<'EOF'
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labelYaml}
spec:
  runStrategy: Always
  template:
    metadata:
      labels:
        kubevirt.io/vm: ${name}
    spec:
      domain:
        devices:
          disks:
            - disk:
                bus: virtio
              name: containerdisk
        resources:
          requests:
            memory: 512Mi
      volumes:
        - containerDisk:
            image: quay.io/kubevirt/cirros-container-disk-demo
          name: containerdisk
EOF`);

    return name;
  }

  async vmIsRunning(name: string, namespace: string): Promise<boolean> {
    const output = await this.run(
      `oc get vm ${name} -n ${namespace} -o jsonpath='{.status.printableStatus}' 2>/dev/null || true`
    );
    return output.includes('Running');
  }

  async vmDeleteTestVM(name: string, namespace: string): Promise<void> {
    await this.run(`oc delete vm ${name} -n ${namespace} --ignore-not-found`);
  }

  // ---------------------------------------------------------------------------
  // Policy (ConfigurationPolicy) operations
  // ---------------------------------------------------------------------------

  async policyExists(policyName: string, namespace: string): Promise<boolean> {
    return this.run(
      `oc get configurationpolicy ${policyName} -n ${namespace} --no-headers 2>/dev/null`,
    )
      .then(() => true)
      .catch(() => false);
  }

  async policyAddLabels(
    policyName: string,
    namespace: string,
    labels: Record<string, string>,
  ): Promise<void> {
    const labelArgs = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    await this.run(
      `oc label configurationpolicy ${policyName} -n ${namespace} ${labelArgs}`,
    );
  }

  async policyRemoveLabels(
    policyName: string,
    namespace: string,
    labelKeys: string[],
  ): Promise<void> {
    const removeArgs = labelKeys.map((k) => `${k}-`).join(' ');
    await this.run(
      `oc label configurationpolicy ${policyName} -n ${namespace} ${removeArgs} 2>/dev/null || true`,
    );
  }

  async policyGetLabels(policyName: string, namespace: string): Promise<string> {
    return this.run(
      `oc get configurationpolicy ${policyName} -n ${namespace} -o jsonpath='{.metadata.labels}'`,
    );
  }
}
