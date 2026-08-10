/** Flux CD application deploy payload (oc apply templates + UI verify). */
export type CreateFluxApplicationOptions = {
  kind: 'git' | 'helm';
  applicationName: string;
  namespace: string;
  clusterName?: string;
  deployment: string;
  service: string;
  route?: string;
  successNumber: number;
  topologyIcons: string[];
  git?: { path: string };
  helm?: { chartName: string; packageVersion: string };
  gitAppTemplateRelativePath?: string;
  helmAppTemplateRelativePath?: string;
};

/** Attach runtime cluster name (managed cluster from env / managedClusters.json). */
export function withFluxClusterName(
  spec: CreateFluxApplicationOptions,
  clusterName: string
): CreateFluxApplicationOptions {
  return { ...spec, clusterName };
}
