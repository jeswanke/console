/** Argo ApplicationSet pull-model **Generators** wizard — RHACM4K-61948–61957. */

export const ARGO_APPSET_GENERATORS = {
  applicationName: 'app-matrix',
  repoUrl: 'https://github.com/stolostron/application-lifecycle-samples.git',
  destinationNamespace: 'app-matrix-ns',
  placementName: 'app-matrix-placement',
  placementNamespace: 'openshift-gitops',
  argoServerLabel: 'openshift-gitops',
  addGeneratorButtonLabel: 'Add generator',
  removeItemButtonLabel: 'Remove item',
  clusterDecisionRequeueComboboxLabel: /^Select the requeue time$/i,
  tolerationUnreachable: 'cluster.open-cluster-management.io/unreachable',
  tolerationUnavailable: 'cluster.open-cluster-management.io/unavailable',
} as const;

export const ARGO_GENERATOR_DISPLAY_NAMES = [
  'Cluster Decision Resource generator',
  'Clusters generator',
  'Git generator',
  'List generator',
  'Pull Request generator',
  'SCM Provider generator',
  'Plugin generator',
] as const;

export type ArgoGeneratorDisplayName = (typeof ARGO_GENERATOR_DISPLAY_NAMES)[number];

export const ARGO_GENERATOR_YAML_KEYS = [
  'clusterDecisionResource',
  'clusters',
  'git',
  'list',
  'pullRequest',
  'scmProvider',
  'plugin',
] as const;

export type ArgoGeneratorYamlKey = (typeof ARGO_GENERATOR_YAML_KEYS)[number];

export const ARGO_GENERATOR_DISPLAY_TO_YAML_KEY: Record<ArgoGeneratorDisplayName, ArgoGeneratorYamlKey> = {
  'Cluster Decision Resource generator': 'clusterDecisionResource',
  'Clusters generator': 'clusters',
  'Git generator': 'git',
  'List generator': 'list',
  'Pull Request generator': 'pullRequest',
  'SCM Provider generator': 'scmProvider',
  'Plugin generator': 'plugin',
};

export const CLUSTER_DECISION_DEFAULT = {
  configMapRef: 'acm-placement',
  labelSelector: {
    matchLabels: { 'cluster.open-cluster-management.io/placement': 'app-matrix-placement' },
  },
  requeueAfterSeconds: 180,
} as const;

export const CLUSTER_DECISION_SECOND = {
  ...CLUSTER_DECISION_DEFAULT,
  labelSelector: { matchLabels: { 'cluster.open-cluster-management.io/placement': '-placement' } },
} as const;

export const CLUSTERS_DEFAULT_CONFIG = { matchLabels: [{ key: 'test', value: 'true' }] } as const;

export const GIT_DEFAULT_CONFIG = {
  repoURL: 'https://github.com/argoproj/argo-cd.git',
  revision: 'HEAD',
  directories: ['applicationset/examples/git-generator-directory/cluster-addons/*'],
  requeueAfterSeconds: 180,
} as const;

export const GIT_DIRECTORY_PATH =
  'applicationset/examples/git-generator-directory/cluster-addons/*' as const;

export const LIST_DEFAULT_ELEMENTS = [
  { cluster: 'engineering-dev', url: 'https://kubernetes.default.svc' },
  { cluster: 'test', url: 'https://kubernetes.default.svc' },
] as const;

export const LIST_DEFAULT_CONFIG = { elements: LIST_DEFAULT_ELEMENTS } as const;

export const PULL_REQUEST_DEFAULT_CONFIG = {
  owner: 'myorg',
  repo: 'myrepository',
  api: 'https://git.example.com/',
  tokenSecretName: 'github-token',
  tokenKey: 'token',
  appSecretName: 'github-app-repo-creds',
  labels: ['test'],
  requeueAfterSeconds: 180,
} as const;

export const SCM_PROVIDER_DEFAULT_CONFIG = {
  organization: 'myorg',
  api: 'https://git.example.com/',
  allBranches: true,
  tokenSecretName: 'github-token',
  tokenKey: 'token',
  appSecretName: 'gh-app-repo-creds',
} as const;

export const PLUGIN_DEFAULT_CONFIG = {
  configMapRefName: 'my-plugin',
  inputParameters: { key1: 'value1', key2: 'value2', list: 'list,of,values', boolean: 'true' },
  values: { value1: 'something' },
  requeueAfterSeconds: 180,
} as const;

export const CLUSTERS_SHAPE = { selector: { matchLabels: { staging: 'true', test: 'true' } } } as const;
export const GIT_SHAPE = {
  requeueAfterSeconds: 180,
  repoURL: GIT_DEFAULT_CONFIG.repoURL,
  revision: GIT_DEFAULT_CONFIG.revision,
  directories: [{ path: GIT_DIRECTORY_PATH }],
} as const;
export const LIST_SHAPE = { elements: LIST_DEFAULT_ELEMENTS } as const;
export const PULL_REQUEST_SHAPE = {
  github: {
    owner: 'myorg',
    repo: 'myrepository',
    api: 'https://git.example.com/',
    tokenRef: { secretName: 'github-token', key: 'token' },
    appSecretName: 'github-app-repo-creds',
    labels: ['test'],
  },
  requeueAfterSeconds: 180,
} as const;
export const SCM_PROVIDER_SHAPE = {
  github: {
    organization: 'myorg',
    api: 'https://git.example.com/',
    allBranches: true,
    tokenRef: { secretName: 'github-token', key: 'token' },
    appSecretName: 'gh-app-repo-creds',
  },
} as const;
export const PLUGIN_SHAPE = {
  configMapRef: { name: 'my-plugin' },
  input: {
    parameters: {
      key1: 'value1',
      key2: 'value2',
      list: ['list', 'of', 'values'],
      boolean: true,
    },
  },
  values: { value1: 'something' },
  requeueAfterSeconds: 180,
} as const;

export const T_NAME_PATH_BASENAME = {
  'spec.template.metadata.name': `${ARGO_APPSET_GENERATORS.applicationName}-{{name}}-{{path.basename}}`,
  'spec.template.spec.destination.namespace': '{{path.basename}}',
} as const;

export const T_NAME_DEST = {
  'spec.template.metadata.name': `${ARGO_APPSET_GENERATORS.applicationName}-{{name}}`,
  'spec.template.spec.destination.namespace': ARGO_APPSET_GENERATORS.destinationNamespace,
} as const;

export const T_CLUSTER_URL_DEST = {
  'spec.template.metadata.name': `${ARGO_APPSET_GENERATORS.applicationName}-{{.cluster}}`,
  'spec.template.spec.destination.server': '{{.url}}',
  'spec.template.spec.destination.namespace': ARGO_APPSET_GENERATORS.destinationNamespace,
} as const;

export const T_CLUSTER_URL_PATH_BASENAME = {
  'spec.template.metadata.name': `${ARGO_APPSET_GENERATORS.applicationName}-{{.cluster}}`,
  'spec.template.spec.destination.server': '{{.url}}',
  'spec.template.spec.destination.namespace': '{{path.basename}}',
} as const;

export const T_GIT_LIST_DEST = {
  'spec.template.metadata.name': `${ARGO_APPSET_GENERATORS.applicationName}-{{.cluster}}`,
  'spec.template.spec.destination.server': '{{.url}}',
  'spec.template.spec.destination.namespace': '{{path.basename}}',
} as const;

export const T_CLUSTER_NAME_DEST = {
  'spec.template.metadata.name': `${ARGO_APPSET_GENERATORS.applicationName}-{{.cluster}}-{{name}}`,
  'spec.template.spec.destination.namespace': ARGO_APPSET_GENERATORS.destinationNamespace,
} as const;

export type ClusterDecisionResourceConfig = typeof CLUSTER_DECISION_DEFAULT;
export type ClustersGeneratorConfig = typeof CLUSTERS_DEFAULT_CONFIG;
export type GitGeneratorConfig = typeof GIT_DEFAULT_CONFIG;
export type ListGeneratorConfig = typeof LIST_DEFAULT_CONFIG;
export type PullRequestGeneratorConfig = typeof PULL_REQUEST_DEFAULT_CONFIG;
export type ScmProviderGeneratorConfig = typeof SCM_PROVIDER_DEFAULT_CONFIG;
export type PluginGeneratorConfig = typeof PLUGIN_DEFAULT_CONFIG;

export type GeneratorConfigByName = Partial<{
  'Cluster Decision Resource generator': ClusterDecisionResourceConfig;
  'Clusters generator': ClustersGeneratorConfig;
  'Git generator': GitGeneratorConfig;
  'List generator': ListGeneratorConfig;
  'Pull Request generator': PullRequestGeneratorConfig;
  'SCM Provider generator': ScmProviderGeneratorConfig;
  'Plugin generator': PluginGeneratorConfig;
}>;

export type YamlTemplateFields = Record<string, string>;

export type ClusterDecisionResourceShape = typeof CLUSTER_DECISION_DEFAULT | typeof CLUSTER_DECISION_SECOND;
export type ClustersGeneratorShape = typeof CLUSTERS_SHAPE;
export type GitGeneratorShape = typeof GIT_SHAPE;
export type ListGeneratorShape = typeof LIST_SHAPE;
export type PullRequestGeneratorShape = typeof PULL_REQUEST_SHAPE;
export type ScmProviderGeneratorShape = typeof SCM_PROVIDER_SHAPE;
export type PluginGeneratorShape = typeof PLUGIN_SHAPE;

export type GeneratorShape =
  | ClusterDecisionResourceShape
  | ClustersGeneratorShape
  | GitGeneratorShape
  | ListGeneratorShape
  | PullRequestGeneratorShape
  | ScmProviderGeneratorShape
  | PluginGeneratorShape;

export type SingleGeneratorAssertion = {
  kind: 'single';
  generatorKey: ArgoGeneratorYamlKey;
  shape: GeneratorShape;
  templateFields?: YamlTemplateFields;
  hasClusterDecision: boolean;
  placementName?: string;
  placementNamespace?: string;
};

export type MatrixGeneratorAssertion = {
  kind: 'matrix';
  innerKeys: ArgoGeneratorYamlKey[];
  shapes: GeneratorShape[];
  templateFields?: YamlTemplateFields;
  hasClusterDecision: boolean;
  placementName?: string;
  placementNamespace?: string;
};

export type GeneratorAssertion = SingleGeneratorAssertion | MatrixGeneratorAssertion;

export type GeneratorScenario = {
  name: string;
  hasClusterDecision: boolean;
  generatorNames: ArgoGeneratorDisplayName[];
  config?: GeneratorConfigByName;
  assertion: GeneratorAssertion;
};

export function getArgoGeneratorDefaultConfig(
  displayName: ArgoGeneratorDisplayName
): GeneratorConfigByName[ArgoGeneratorDisplayName] | undefined {
  switch (displayName) {
    case 'Clusters generator':
      return CLUSTERS_DEFAULT_CONFIG;
    case 'Git generator':
      return GIT_DEFAULT_CONFIG;
    case 'List generator':
      return LIST_DEFAULT_CONFIG;
    case 'Pull Request generator':
      return PULL_REQUEST_DEFAULT_CONFIG;
    case 'SCM Provider generator':
      return SCM_PROVIDER_DEFAULT_CONFIG;
    case 'Plugin generator':
      return PLUGIN_DEFAULT_CONFIG;
    default:
      return undefined;
  }
}
