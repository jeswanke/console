import type {
  AnsibleScaleFixturePayload,
  AnsibleScaleSuitePayload,
} from '@config';
import type { OcCliService } from '@services/OcCliService';
import {
  applyYamlTemplate,
  cleanupYamlTemplateTemp,
  deleteYamlTemplate,
} from '@lib/oc/apply-yaml-template';

function clusterReplacements(
  suite: AnsibleScaleSuitePayload,
  managedClusterName: string
): Record<string, string> {
  return { [suite.clusterNamePlaceholder]: managedClusterName };
}

/** Apply ansible-scale manifest with managed cluster name substituted into Placement. */
export async function applyAnsibleScaleFixture(
  oc: OcCliService,
  config: AnsibleScaleFixturePayload,
  suite: AnsibleScaleSuitePayload,
  managedClusterName: string
): Promise<{ appliedManifestPath: string }> {
  await oc.deleteNamespace(config.namespace).catch(() => undefined);
  for (const ns of config.channelNamespaces ?? []) {
    await oc.deleteNamespace(ns).catch(() => undefined);
  }
  const { appliedManifestPath } = await applyYamlTemplate(
    oc,
    config.setupYamlRelativePath,
    clusterReplacements(suite, managedClusterName),
    'e2e-ansible-scale-'
  );
  await oc.labelNamespaceForAlcTest(config.namespace);
  return { appliedManifestPath };
}

/** Remove hub resources from the same substituted manifest used at apply time. */
export async function cleanupAnsibleScaleFixture(
  oc: OcCliService,
  config: AnsibleScaleFixturePayload,
  suite: AnsibleScaleSuitePayload,
  options: { appliedManifestPath?: string; managedClusterName?: string }
): Promise<void> {
  if (options.appliedManifestPath) {
    await oc.deleteYaml(options.appliedManifestPath).catch(() => undefined);
    cleanupYamlTemplateTemp(options.appliedManifestPath);
    return;
  }
  if (options.managedClusterName) {
    await deleteYamlTemplate(
      oc,
      config.setupYamlRelativePath,
      clusterReplacements(suite, options.managedClusterName),
      'e2e-ansible-scale-cleanup-'
    );
  }
}
