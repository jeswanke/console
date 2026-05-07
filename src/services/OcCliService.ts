import { exec, execFile } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

/** Minimal validation so `applicationName` / `namespace` are safe as `oc` argv (no shell). */
function assertSafeOcSingleArg(value: string, field: string): void {
  const v = value.trim();
  if (!v || v.length > 253 || /[^a-zA-Z0-9.-]/.test(v)) {
    throw new Error(`OcCliService: invalid ${field} for oc argv (${JSON.stringify(value)})`);
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
}
