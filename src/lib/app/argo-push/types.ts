/** Git repository fields on the push-model **Template** step. */
export type ArgoPushGitRepositorySpec = {
  url: string;
  branch?: string;
  path?: string;
};

export type CreateArgoPushApplicationOptions = {
  /** ApplicationSet `metadata.name`. */
  applicationName: string;
  /**
   * Argo server label in **Select the Argo server** (e.g. `openshift-gitops`).
   * Also becomes ApplicationSet `metadata.namespace` after selection.
   */
  argoServerLabel: string;
  /** Remote destination namespace on managed clusters (`spec.template.spec.destination.namespace`). */
  destinationNamespace: string;
  git: ArgoPushGitRepositorySpec;
  /** Managed cluster set on **Placement** (default from GitOps prep: `auto-gitops-cluster-set`). */
  clusterSet: string;
  /** Requeue time (seconds) on **Generators** — hub default is often `180`. */
  requeueTimeSeconds?: number;
  /** Collapse YAML split panel before filling (default `true`). */
  collapseYamlPanel?: boolean;
  /** Click **Submit** on **Review** (default `true`). */
  submit?: boolean;
  /**
   * When **false** (default): if ApplicationSet already exists in the Argo server namespace, skip wizard
   * and open overview. When **true**: throw if duplicate.
   */
  applicationSetExistsError?: boolean;
};
