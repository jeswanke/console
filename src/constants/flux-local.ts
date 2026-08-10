/** Shared Flux CD template paths (hub `beforeAll` repo apply). */

export const FLUX_LOCAL_REPOS = {
  gitRepoRelativePath: 'src/templates/app/flux/flux-git-repo.yaml',
  helmRepoRelativePath: 'src/templates/app/flux/flux-helm-repo.yaml',
  gitAppTemplateRelativePath: 'src/templates/app/flux/flux-git-template.yaml',
  helmAppTemplateRelativePath: 'src/templates/app/flux/flux-helm-template.yaml',
} as const;

/** Default cluster for local Flux scenarios (`flux_local_cluster` fragment). */
export const FLUX_LOCAL_CLUSTER = 'local-cluster' as const;
