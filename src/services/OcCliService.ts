import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

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
}
