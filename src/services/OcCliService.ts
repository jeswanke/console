import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

export class OcCliService {
  async run(cmd: string) {
    try {
      const { stdout } = await execPromise(cmd);
      return stdout.trim();
    } catch (error) {
      console.error(`Error executing command: ${cmd}`, error);
      throw error;
    }
  }

  async applyYaml(yamlPath: string) {
    return this.run(`oc apply -f ${yamlPath}`);
  }

  async getToken() {
    try {
      return await this.run('oc whoami -t');
    } catch (error) {
      throw new Error('Failed to get oc token. Are you logged in via "oc login"?');
    }
  }

  async getConsoleUrl() {
    return this.run('oc get route console -n openshift-console -o jsonpath="{.spec.host}"').then(host => `https://${host}`);
  }

  async getOAuthHost() {
    return this.run('oc get route oauth-openshift -n openshift-authentication -o jsonpath="{.spec.host}"');
  }
}

