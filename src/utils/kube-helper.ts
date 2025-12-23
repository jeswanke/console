export class KubeHelper {
  /**
   * Generates a safe Kubernetes resource name.
   * @param prefix The prefix for the name (e.g., 'ci', 'test').
   * @returns A string like 'ci-abc12'.
   */
  static generateSafeName(prefix: string): string {
    const suffix = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${suffix}`;
  }

  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

