import { OcCliService } from '@services/OcCliService';

/**
 * Domain service for Observability-related CLI operations.
 *
 * Composes OcCliService for multicluster-observability checks,
 * managed cluster listing, and Grafana annotation management.
 * No Playwright imports -- backend only.
 */
export class ObservabilityService {
  constructor(private readonly oc: OcCliService) {}

  async isInstalled(): Promise<boolean> {
    try {
      await this.oc.run(
        'oc get multiclusterobservability observability -o name',
      );
      return true;
    } catch {
      return false;
    }
  }

  async getManagedClusters(
    excludeLocal = true,
  ): Promise<string[]> {
    try {
      const raw = await this.oc.run(
        'oc get managedclusters -o jsonpath={.items[*].metadata.name}',
      );
      const all = raw
        .replace(/"/g, '')
        .split(' ')
        .map((s) => s.trim())
        .filter(Boolean);
      return excludeLocal
        ? all.filter((s) => s !== 'local-cluster')
        : all;
    } catch {
      return [];
    }
  }

  async getGrafanaAnnotation(): Promise<string> {
    try {
      const raw = await this.oc.run(
        "oc get clustermanagementaddon observability-controller -o jsonpath='{.metadata.annotations.console\\.open-cluster-management\\.io/launch-link}'",
      );
      return raw.replace(/'/g, '');
    } catch {
      return '';
    }
  }

  async removeGrafanaAnnotation(): Promise<void> {
    await this.oc.run(
      'oc annotate clustermanagementaddon observability-controller console.open-cluster-management.io/launch-link- --overwrite',
    );
  }

  async restoreGrafanaAnnotation(
    annotation: string,
  ): Promise<void> {
    if (!annotation) return;
    await this.oc.run(
      `oc annotate clustermanagementaddon observability-controller console.open-cluster-management.io/launch-link=${annotation} --overwrite`,
    );
  }
}
