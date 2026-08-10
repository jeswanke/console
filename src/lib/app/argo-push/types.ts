import type { TopologyClusterResourceRef } from '@lib/app/topology/graph-ids';

/** Git repository fields on the push-model **Template** step. */
export type ArgoPushGitRepositorySpec = {
  url: string;
  branch?: string;
  path?: string;
};

/** Helm repository fields on the push-model **Template** step (multi-source). */
export type ArgoPushHelmRepositorySpec = {
  url: string;
  chartName: string;
  packageVersion: string;
};

/** Label expression row on **Placement** (new placement path). */
export type ArgoPushPlacementLabelExpression = {
  labelName: string;
  labelValues: string[];
  /** PF operator menu label (default `In` → "equals any of"). */
  operator?: 'In';
};

export type CreateArgoPushApplicationOptions = {
  /** ApplicationSet `metadata.name`. */
  applicationName: string;
  /**
   * Argo server label in **Select the Argo server** (e.g. `openshift-gitops` or `empty-placement-cluster`).
   * When omitted, {@link applicationSetNamespace} defaults to this value for CR existence checks.
   */
  argoServerLabel: string;
  /** ApplicationSet `metadata.namespace` when it differs from {@link argoServerLabel} (RHACM4K-40996). */
  applicationSetNamespace?: string;
  /** Remote destination namespace on managed clusters (`spec.template.spec.destination.namespace`). */
  destinationNamespace: string;
  git?: ArgoPushGitRepositorySpec;
  /** Second **Template** source when {@link multiSource} is true. */
  helm?: ArgoPushHelmRepositorySpec;
  /** Git + Helm on **Template** (RHACM4K-37185). */
  multiSource?: boolean;
  /** When true, uncheck **Automated sync** on Sync policy (RHACM4K-61942). */
  disableAutomatedSync?: boolean;
  /** Extra wait after create (ms) before list assertions (RHACM4K-4043). */
  postCreateWaitMs?: number;
  /** Managed cluster set on **Placement** (default from GitOps prep: `auto-gitops-cluster-set`). */
  clusterSet: string;
  /** Optional label expression on **Placement** (e.g. `name` / `local-cluster`). */
  placementLabelExpression?: ArgoPushPlacementLabelExpression;
  /** Requeue time (seconds) on **Generators** — hub default is often `180`. */
  requeueTimeSeconds?: number;
  /** Collapse YAML split panel before filling (default `true`). */
  collapseYamlPanel?: boolean;
  /** Click **Submit** on **Review** (default `true`). */
  submit?: boolean;
  /**
   * Deployed resources expected on Topology (kind/name; used by `data-id` builders in appset-graph-ids).
   * helloworld / helloworld-argo paths typically omit Route on ApplicationSet graphs.
   */
  clusterResources?: TopologyClusterResourceRef[];
  /**
   * When **false** (default): if ApplicationSet already exists in the Argo server namespace, skip wizard
   * and open overview. When **true**: throw if duplicate.
   */
  applicationSetExistsError?: boolean;
  /** RHACM4K-64219 pull-model wizard name when it differs from {@link applicationName} (push). */
  pullApplicationName?: string;
  /** RHACM4K-64219 pre-created Placement for existing-placement preview (push wizard). */
  existingPlacementName?: string;
  /** RHACM4K-64219 hub fixture applied in `beforeAll` (path relative to project root). */
  setupYamlRelativePath?: string;
  /** Details tab minimum green cluster-resource status count (Cypress `successNumber`). */
  successNumber?: number;
};
