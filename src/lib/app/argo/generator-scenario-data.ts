import {
  ARGO_APPSET_GENERATORS,
  CLUSTER_DECISION_DEFAULT,
  CLUSTER_DECISION_SECOND,
  CLUSTERS_DEFAULT_CONFIG,
  CLUSTERS_SHAPE,
  GIT_DEFAULT_CONFIG,
  GIT_SHAPE,
  LIST_DEFAULT_CONFIG,
  LIST_SHAPE,
  PLUGIN_DEFAULT_CONFIG,
  PLUGIN_SHAPE,
  PULL_REQUEST_DEFAULT_CONFIG,
  PULL_REQUEST_SHAPE,
  SCM_PROVIDER_DEFAULT_CONFIG,
  SCM_PROVIDER_SHAPE,
  T_CLUSTER_URL_DEST,
  T_CLUSTER_URL_PATH_BASENAME,
  T_GIT_LIST_DEST,
  T_NAME_DEST,
  T_NAME_PATH_BASENAME,
  type GeneratorScenario,
} from '@constants/argo-appset-generators';

const PLACEMENT_NAME = ARGO_APPSET_GENERATORS.placementName;
const PLACEMENT_NAMESPACE = ARGO_APPSET_GENERATORS.placementNamespace;

/** RHACM4K-61948 — Cluster Decision Resource generator first. */
const RHACM4K_61948_SCENARIOS: GeneratorScenario[] = [
  {
    name: 'Cluster Decision only',
    hasClusterDecision: true,
    generatorNames: ['Cluster Decision Resource generator'],
    assertion: {
      kind: 'single',
      generatorKey: 'clusterDecisionResource',
      shape: CLUSTER_DECISION_DEFAULT,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Two Cluster Decision generators',
    hasClusterDecision: true,
    generatorNames: ['Cluster Decision Resource generator', 'Cluster Decision Resource generator'],
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusterDecisionResource', 'clusterDecisionResource'],
      shapes: [CLUSTER_DECISION_DEFAULT, CLUSTER_DECISION_SECOND],
      hasClusterDecision: true,
    },
  },
  {
    name: 'Cluster Decision + Clusters generator',
    hasClusterDecision: true,
    generatorNames: ['Cluster Decision Resource generator', 'Clusters generator'],
    config: { 'Clusters generator': CLUSTERS_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusterDecisionResource', 'clusters'],
      shapes: [CLUSTER_DECISION_DEFAULT, CLUSTERS_SHAPE],
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Cluster Decision + Git generator',
    hasClusterDecision: true,
    generatorNames: ['Cluster Decision Resource generator', 'Git generator'],
    config: { 'Git generator': GIT_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusterDecisionResource', 'git'],
      shapes: [CLUSTER_DECISION_DEFAULT, GIT_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Cluster Decision + List generator',
    hasClusterDecision: true,
    generatorNames: ['Cluster Decision Resource generator', 'List generator'],
    config: { 'List generator': LIST_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusterDecisionResource', 'list'],
      shapes: [CLUSTER_DECISION_DEFAULT, LIST_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Cluster Decision + Pull Request generator',
    hasClusterDecision: true,
    generatorNames: ['Cluster Decision Resource generator', 'Pull Request generator'],
    config: { 'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusterDecisionResource', 'pullRequest'],
      shapes: [CLUSTER_DECISION_DEFAULT, PULL_REQUEST_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Cluster Decision + SCM Provider generator',
    hasClusterDecision: true,
    generatorNames: ['Cluster Decision Resource generator', 'SCM Provider generator'],
    config: { 'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusterDecisionResource', 'scmProvider'],
      shapes: [CLUSTER_DECISION_DEFAULT, SCM_PROVIDER_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Cluster Decision + Plugin generator',
    hasClusterDecision: true,
    generatorNames: ['Cluster Decision Resource generator', 'Plugin generator'],
    config: { 'Plugin generator': PLUGIN_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusterDecisionResource', 'plugin'],
      shapes: [CLUSTER_DECISION_DEFAULT, PLUGIN_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
];

/** RHACM4K-61951 — Clusters generator first. */
const RHACM4K_61951_SCENARIOS: GeneratorScenario[] = [
  {
    name: 'Clusters only',
    hasClusterDecision: false,
    generatorNames: ['Clusters generator'],
    config: { 'Clusters generator': CLUSTERS_DEFAULT_CONFIG },
    assertion: {
      kind: 'single',
      generatorKey: 'clusters',
      shape: CLUSTERS_SHAPE,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Clusters + Cluster Decision Resource generator',
    hasClusterDecision: true,
    generatorNames: ['Clusters generator', 'Cluster Decision Resource generator'],
    config: { 'Clusters generator': CLUSTERS_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusters', 'clusterDecisionResource'],
      shapes: [CLUSTERS_SHAPE, CLUSTER_DECISION_DEFAULT],
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Clusters + Clusters generator',
    hasClusterDecision: false,
    generatorNames: ['Clusters generator', 'Clusters generator'],
    config: { 'Clusters generator': CLUSTERS_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusters', 'clusters'],
      shapes: [CLUSTERS_SHAPE],
      hasClusterDecision: false,
    },
  },
  {
    name: 'Clusters + Git generator',
    hasClusterDecision: false,
    generatorNames: ['Clusters generator', 'Git generator'],
    config: {
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
      'Git generator': GIT_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusters', 'git'],
      shapes: [CLUSTERS_SHAPE, GIT_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Clusters + List generator',
    hasClusterDecision: false,
    generatorNames: ['Clusters generator', 'List generator'],
    config: {
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
      'List generator': LIST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusters', 'list'],
      shapes: [CLUSTERS_SHAPE, LIST_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Clusters + Pull Request generator',
    hasClusterDecision: false,
    generatorNames: ['Clusters generator', 'Pull Request generator'],
    config: {
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusters', 'pullRequest'],
      shapes: [CLUSTERS_SHAPE, PULL_REQUEST_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Clusters + SCM Provider generator',
    hasClusterDecision: false,
    generatorNames: ['Clusters generator', 'SCM Provider generator'],
    config: {
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusters', 'scmProvider'],
      shapes: [CLUSTERS_SHAPE, SCM_PROVIDER_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Clusters + Plugin generator',
    hasClusterDecision: false,
    generatorNames: ['Clusters generator', 'Plugin generator'],
    config: {
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['clusters', 'plugin'],
      shapes: [CLUSTERS_SHAPE, PLUGIN_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
];

/** RHACM4K-61952 — Git generator first. */
const RHACM4K_61952_SCENARIOS: GeneratorScenario[] = [
  {
    name: 'Git only',
    hasClusterDecision: false,
    generatorNames: ['Git generator'],
    config: { 'Git generator': GIT_DEFAULT_CONFIG },
    assertion: {
      kind: 'single',
      generatorKey: 'git',
      shape: GIT_SHAPE,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Git + Git generator',
    hasClusterDecision: false,
    generatorNames: ['Git generator', 'Git generator'],
    config: { 'Git generator': GIT_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['git', 'git'],
      shapes: [GIT_SHAPE],
      hasClusterDecision: false,
    },
  },
  {
    name: 'Git + Cluster Decision Resource generator',
    hasClusterDecision: true,
    generatorNames: ['Git generator', 'Cluster Decision Resource generator'],
    config: { 'Git generator': GIT_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['git', 'clusterDecisionResource'],
      shapes: [GIT_SHAPE, CLUSTER_DECISION_DEFAULT],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Git + Clusters generator',
    hasClusterDecision: false,
    generatorNames: ['Git generator', 'Clusters generator'],
    config: {
      'Git generator': GIT_DEFAULT_CONFIG,
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['git', 'clusters'],
      shapes: [GIT_SHAPE, CLUSTERS_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Git + List generator',
    hasClusterDecision: false,
    generatorNames: ['Git generator', 'List generator'],
    config: {
      'Git generator': GIT_DEFAULT_CONFIG,
      'List generator': LIST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['git', 'list'],
      shapes: [GIT_SHAPE, LIST_SHAPE],
      templateFields: T_CLUSTER_URL_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Git + Pull Request generator',
    hasClusterDecision: false,
    generatorNames: ['Git generator', 'Pull Request generator'],
    config: {
      'Git generator': GIT_DEFAULT_CONFIG,
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['git', 'pullRequest'],
      shapes: [GIT_SHAPE, PULL_REQUEST_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Git + SCM Provider generator',
    hasClusterDecision: false,
    generatorNames: ['Git generator', 'SCM Provider generator'],
    config: {
      'Git generator': GIT_DEFAULT_CONFIG,
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['git', 'scmProvider'],
      shapes: [GIT_SHAPE, SCM_PROVIDER_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Git + Plugin generator',
    hasClusterDecision: false,
    generatorNames: ['Git generator', 'Plugin generator'],
    config: {
      'Git generator': GIT_DEFAULT_CONFIG,
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['git', 'plugin'],
      shapes: [GIT_SHAPE, PLUGIN_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
];

/** RHACM4K-61953 — List generator first. */
const RHACM4K_61953_SCENARIOS: GeneratorScenario[] = [
  {
    name: 'List only',
    hasClusterDecision: false,
    generatorNames: ['List generator'],
    config: { 'List generator': LIST_DEFAULT_CONFIG },
    assertion: {
      kind: 'single',
      generatorKey: 'list',
      shape: LIST_SHAPE,
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'List + List generator',
    hasClusterDecision: false,
    generatorNames: ['List generator', 'List generator'],
    config: { 'List generator': LIST_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['list', 'list'],
      shapes: [LIST_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'List + Cluster Decision Resource generator',
    hasClusterDecision: true,
    generatorNames: ['List generator', 'Cluster Decision Resource generator'],
    config: { 'List generator': LIST_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['list', 'clusterDecisionResource'],
      shapes: [LIST_SHAPE, CLUSTER_DECISION_DEFAULT],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'List + Clusters generator',
    hasClusterDecision: false,
    generatorNames: ['List generator', 'Clusters generator'],
    config: {
      'List generator': LIST_DEFAULT_CONFIG,
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['list', 'clusters'],
      shapes: [LIST_SHAPE, CLUSTERS_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'List + Git generator',
    hasClusterDecision: false,
    generatorNames: ['List generator', 'Git generator'],
    config: {
      'List generator': LIST_DEFAULT_CONFIG,
      'Git generator': GIT_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['list', 'git'],
      shapes: [LIST_SHAPE, GIT_SHAPE],
      templateFields: T_GIT_LIST_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'List + Pull Request generator',
    hasClusterDecision: false,
    generatorNames: ['List generator', 'Pull Request generator'],
    config: {
      'List generator': LIST_DEFAULT_CONFIG,
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['list', 'pullRequest'],
      shapes: [LIST_SHAPE, PULL_REQUEST_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'List + SCM Provider generator',
    hasClusterDecision: false,
    generatorNames: ['List generator', 'SCM Provider generator'],
    config: {
      'List generator': LIST_DEFAULT_CONFIG,
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['list', 'scmProvider'],
      shapes: [LIST_SHAPE, SCM_PROVIDER_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'List + Plugin generator',
    hasClusterDecision: false,
    generatorNames: ['List generator', 'Plugin generator'],
    config: {
      'List generator': LIST_DEFAULT_CONFIG,
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['list', 'plugin'],
      shapes: [LIST_SHAPE, PLUGIN_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
];

/**
 * RHACM4K-61954 — Cypress title says Pull Request; scenario array is `pluginFirstScenarios`.
 * Content preserved per Polarion ID (Plugin generator scenarios).
 */
const RHACM4K_61954_SCENARIOS: GeneratorScenario[] = [
  {
    name: 'Plugin only',
    hasClusterDecision: false,
    generatorNames: ['Plugin generator'],
    config: { 'Plugin generator': PLUGIN_DEFAULT_CONFIG },
    assertion: {
      kind: 'single',
      generatorKey: 'plugin',
      shape: PLUGIN_SHAPE,
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Plugin + Plugin generator',
    hasClusterDecision: false,
    generatorNames: ['Plugin generator', 'Plugin generator'],
    config: { 'Plugin generator': PLUGIN_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['plugin', 'plugin'],
      shapes: [PLUGIN_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Plugin + Cluster Decision Resource generator',
    hasClusterDecision: true,
    generatorNames: ['Plugin generator', 'Cluster Decision Resource generator'],
    config: { 'Plugin generator': PLUGIN_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['plugin', 'clusterDecisionResource'],
      shapes: [PLUGIN_SHAPE, CLUSTER_DECISION_DEFAULT],
      templateFields: T_NAME_DEST,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Plugin + Clusters generator',
    hasClusterDecision: false,
    generatorNames: ['Plugin generator', 'Clusters generator'],
    config: {
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['plugin', 'clusters'],
      shapes: [PLUGIN_SHAPE, CLUSTERS_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Plugin + Git generator',
    hasClusterDecision: false,
    generatorNames: ['Plugin generator', 'Git generator'],
    config: {
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
      'Git generator': GIT_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['plugin', 'git'],
      shapes: [PLUGIN_SHAPE, GIT_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Plugin + List generator',
    hasClusterDecision: false,
    generatorNames: ['Plugin generator', 'List generator'],
    config: {
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
      'List generator': LIST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['plugin', 'list'],
      shapes: [PLUGIN_SHAPE, LIST_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Plugin + Pull Request generator',
    hasClusterDecision: false,
    generatorNames: ['Plugin generator', 'Pull Request generator'],
    config: {
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['plugin', 'pullRequest'],
      shapes: [PLUGIN_SHAPE, PULL_REQUEST_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Plugin + SCM Provider generator',
    hasClusterDecision: false,
    generatorNames: ['Plugin generator', 'SCM Provider generator'],
    config: {
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['plugin', 'scmProvider'],
      shapes: [PLUGIN_SHAPE, SCM_PROVIDER_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
];

/**
 * RHACM4K-61956 — Cypress title says Plugin; scenario array is `pullRequestFirstScenarios`.
 * Content preserved per Polarion ID (Pull Request generator scenarios).
 */
const RHACM4K_61956_SCENARIOS: GeneratorScenario[] = [
  {
    name: 'Pull Request only',
    hasClusterDecision: false,
    generatorNames: ['Pull Request generator'],
    config: { 'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG },
    assertion: {
      kind: 'single',
      generatorKey: 'pullRequest',
      shape: PULL_REQUEST_SHAPE,
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Pull Request + Pull Request generator',
    hasClusterDecision: false,
    generatorNames: ['Pull Request generator', 'Pull Request generator'],
    config: { 'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['pullRequest', 'pullRequest'],
      shapes: [PULL_REQUEST_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Pull Request + Cluster Decision Resource generator',
    hasClusterDecision: true,
    generatorNames: ['Pull Request generator', 'Cluster Decision Resource generator'],
    config: { 'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['pullRequest', 'clusterDecisionResource'],
      shapes: [PULL_REQUEST_SHAPE, CLUSTER_DECISION_DEFAULT],
      templateFields: T_NAME_DEST,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'Pull Request + Clusters generator',
    hasClusterDecision: false,
    generatorNames: ['Pull Request generator', 'Clusters generator'],
    config: {
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['pullRequest', 'clusters'],
      shapes: [PULL_REQUEST_SHAPE, CLUSTERS_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Pull Request + Git generator',
    hasClusterDecision: false,
    generatorNames: ['Pull Request generator', 'Git generator'],
    config: {
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
      'Git generator': GIT_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['pullRequest', 'git'],
      shapes: [PULL_REQUEST_SHAPE, GIT_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Pull Request + List generator',
    hasClusterDecision: false,
    generatorNames: ['Pull Request generator', 'List generator'],
    config: {
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
      'List generator': LIST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['pullRequest', 'list'],
      shapes: [PULL_REQUEST_SHAPE, LIST_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Pull Request + SCM Provider generator',
    hasClusterDecision: false,
    generatorNames: ['Pull Request generator', 'SCM Provider generator'],
    config: {
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['pullRequest', 'scmProvider'],
      shapes: [PULL_REQUEST_SHAPE, SCM_PROVIDER_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'Pull Request + Plugin generator',
    hasClusterDecision: false,
    generatorNames: ['Pull Request generator', 'Plugin generator'],
    config: {
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['pullRequest', 'plugin'],
      shapes: [PULL_REQUEST_SHAPE, PLUGIN_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
];

/** RHACM4K-61957 — SCM Provider generator first. */
const RHACM4K_61957_SCENARIOS: GeneratorScenario[] = [
  {
    name: 'SCM Provider only',
    hasClusterDecision: false,
    generatorNames: ['SCM Provider generator'],
    config: { 'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG },
    assertion: {
      kind: 'single',
      generatorKey: 'scmProvider',
      shape: SCM_PROVIDER_SHAPE,
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'SCM Provider + SCM Provider generator',
    hasClusterDecision: false,
    generatorNames: ['SCM Provider generator', 'SCM Provider generator'],
    config: { 'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['scmProvider', 'scmProvider'],
      shapes: [SCM_PROVIDER_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'SCM Provider + Cluster Decision Resource generator',
    hasClusterDecision: true,
    generatorNames: ['SCM Provider generator', 'Cluster Decision Resource generator'],
    config: { 'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG },
    assertion: {
      kind: 'matrix',
      innerKeys: ['scmProvider', 'clusterDecisionResource'],
      shapes: [SCM_PROVIDER_SHAPE, CLUSTER_DECISION_DEFAULT],
      templateFields: T_NAME_DEST,
      hasClusterDecision: true,
      placementName: PLACEMENT_NAME,
      placementNamespace: PLACEMENT_NAMESPACE,
    },
  },
  {
    name: 'SCM Provider + Clusters generator',
    hasClusterDecision: false,
    generatorNames: ['SCM Provider generator', 'Clusters generator'],
    config: {
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
      'Clusters generator': CLUSTERS_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['scmProvider', 'clusters'],
      shapes: [SCM_PROVIDER_SHAPE, CLUSTERS_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'SCM Provider + Git generator',
    hasClusterDecision: false,
    generatorNames: ['SCM Provider generator', 'Git generator'],
    config: {
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
      'Git generator': GIT_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['scmProvider', 'git'],
      shapes: [SCM_PROVIDER_SHAPE, GIT_SHAPE],
      templateFields: T_NAME_PATH_BASENAME,
      hasClusterDecision: false,
    },
  },
  {
    name: 'SCM Provider + List generator',
    hasClusterDecision: false,
    generatorNames: ['SCM Provider generator', 'List generator'],
    config: {
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
      'List generator': LIST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['scmProvider', 'list'],
      shapes: [SCM_PROVIDER_SHAPE, LIST_SHAPE],
      templateFields: T_CLUSTER_URL_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'SCM Provider + Pull Request generator',
    hasClusterDecision: false,
    generatorNames: ['SCM Provider generator', 'Pull Request generator'],
    config: {
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
      'Pull Request generator': PULL_REQUEST_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['scmProvider', 'pullRequest'],
      shapes: [SCM_PROVIDER_SHAPE, PULL_REQUEST_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
  {
    name: 'SCM Provider + Plugin generator',
    hasClusterDecision: false,
    generatorNames: ['SCM Provider generator', 'Plugin generator'],
    config: {
      'SCM Provider generator': SCM_PROVIDER_DEFAULT_CONFIG,
      'Plugin generator': PLUGIN_DEFAULT_CONFIG,
    },
    assertion: {
      kind: 'matrix',
      innerKeys: ['scmProvider', 'plugin'],
      shapes: [SCM_PROVIDER_SHAPE, PLUGIN_SHAPE],
      templateFields: T_NAME_DEST,
      hasClusterDecision: false,
    },
  },
];

export const GENERATOR_SCENARIOS_BY_TEST_ID: Record<string, GeneratorScenario[]> = {
  '61948': RHACM4K_61948_SCENARIOS,
  '61951': RHACM4K_61951_SCENARIOS,
  '61952': RHACM4K_61952_SCENARIOS,
  '61953': RHACM4K_61953_SCENARIOS,
  '61954': RHACM4K_61954_SCENARIOS,
  '61956': RHACM4K_61956_SCENARIOS,
  '61957': RHACM4K_61957_SCENARIOS,
};
