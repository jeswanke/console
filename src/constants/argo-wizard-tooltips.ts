/** Argo ApplicationSet pull-model wizard **More info** tooltips (RHACM4K-61725). */

export type ArgoWizardTooltipDef = {
  helpButtonSelector: string;
  popoverBodySelector: string;
  expectedText: string | string[];
};

export const ARGO_WIZARD_TOOLTIPS = {
  general: {
    argoServer: {
      helpButtonSelector: '#namespace-label-help-button',
      popoverBodySelector: '#popover-namespace-label-help-popover-body',
      expectedText: [
        'Register a set of one or more managed clusters to Red Hat OpenShift GitOps',
        'View documentation',
      ],
    },
  },
  generators: {
    clusterDecisionRequeue: {
      helpButtonSelector: '#clusterdecisionresource-requeueafterseconds-label-help-button',
      popoverBodySelector: '#popover-clusterdecisionresource-requeueafterseconds-label-help-popover-body',
      expectedText:
        'Sets the time delay in seconds before the application set controller triggers a refresh of the cluster resource decision generator to detect placement decision changes and update the resulting applications.',
    },
    clustersMatchLabels: {
      helpButtonSelector: '#clusters-selector-matchlabels-label-help-button',
      popoverBodySelector: '#popover-clusters-selector-matchlabels-label-help-popover-body',
      expectedText: 'Labels to match clusters by',
    },
    gitRepoUrl: {
      helpButtonSelector: '#git-repourl-label-help-button',
      popoverBodySelector: '#popover-git-repourl-label-help-popover-body',
      expectedText: 'The URL path for the Git repository.',
    },
    gitRevision: {
      helpButtonSelector: '#git-revision-label-help-button',
      popoverBodySelector: '#popover-git-revision-label-help-popover-body',
      expectedText: 'Refer to a single commit',
    },
    gitRequeue: {
      helpButtonSelector: '#git-requeueafterseconds-label-help-button',
      popoverBodySelector: '#popover-git-requeueafterseconds-label-help-popover-body',
      expectedText: 'Git requeue time in seconds',
    },
    pluginInputParams: {
      helpButtonSelector: '#plugin-input-parameters-label-help-button',
      popoverBodySelector: '#popover-plugin-input-parameters-label-help-popover-body',
      expectedText: 'Key-value parameters to pass to the plugin',
    },
    pluginValues: {
      helpButtonSelector: '#plugin-values-label-help-button',
      popoverBodySelector: '#popover-plugin-values-label-help-popover-body',
      expectedText: 'Values to include in the generated parameters',
    },
    pluginRequeue: {
      helpButtonSelector: '#plugin-requeueafterseconds-label-help-button',
      popoverBodySelector: '#popover-plugin-requeueafterseconds-label-help-popover-body',
      expectedText: 'Plugin requeue time in seconds',
    },
    pullRequestRequeue: {
      helpButtonSelector: '#pullrequest-requeueafterseconds-label-help-button',
      popoverBodySelector: '#popover-pullrequest-requeueafterseconds-label-help-popover-body',
      expectedText: 'Pull request requeue time in seconds',
    },
  },
  repository: {
    gitRepoUrl: {
      helpButtonSelector: '#repourl-label-help-button',
      popoverBodySelector: '#popover-repourl-label-help-popover-body',
      expectedText: 'The URL path for the Git repository',
    },
    targetRevision: {
      helpButtonSelector: '#targetrevision-label-help-button',
      popoverBodySelector: '#popover-targetrevision-label-help-popover-body',
      expectedText: 'Refer to a single commit',
    },
    path: {
      helpButtonSelector: '#path-label-help-button',
      popoverBodySelector: '#popover-path-label-help-popover-body',
      expectedText: 'The location of the resources on the Git repository',
    },
    helmRepoUrl: {
      helpButtonSelector: '#repourl-label-help-button',
      popoverBodySelector: '#popover-repourl-label-help-popover-body',
      expectedText: 'The URL path for the Helm repository',
    },
    chart: {
      helpButtonSelector: '#chart-label-help-button',
      popoverBodySelector: '#popover-chart-label-help-popover-body',
      expectedText: 'The specific name for the target Helm chart',
    },
    helmTargetRevision: {
      helpButtonSelector: '#targetrevision-label-help-button',
      popoverBodySelector: '#popover-targetrevision-label-help-popover-body',
      expectedText: 'The version or versions for the deployable',
    },
  },
  syncPolicy: {
    prune: {
      helpButtonSelector: '#spec-template-spec-syncpolicy-automated-prune-label-help-button',
      popoverBodySelector: '#popover-spec-template-spec-syncpolicy-automated-prune-label-help-popover-body',
      expectedText: 'If automated sync is disabled, this option will be ignored.',
    },
    allowEmpty: {
      helpButtonSelector: '#spec-template-spec-syncpolicy-automated-allowempty-label-help-button',
      popoverBodySelector: '#popover-spec-template-spec-syncpolicy-automated-allowempty-label-help-popover-body',
      expectedText: 'If automated sync is disabled, this option will be ignored.',
    },
    selfHeal: {
      helpButtonSelector: '#spec-template-spec-syncpolicy-automated-selfheal-label-help-button',
      popoverBodySelector: '#popover-spec-template-spec-syncpolicy-automated-selfheal-label-help-popover-body',
      expectedText: 'If automated sync is disabled, this option will be ignored.',
    },
  },
  placement: {
    clusterSets: {
      helpButtonSelector: '#clustersets-label-help-button',
      popoverBodySelector: '#popover-clustersets-label-help-popover-body',
      expectedText: 'Select cluster sets from which to select clusters',
    },
    labelExpressions: {
      helpButtonSelector: '#label-expressions-label-help-button',
      popoverBodySelector: '#popover-label-expressions-label-help-popover-body',
      expectedText: 'Select clusters from the clusters in selected cluster sets',
    },
  },
} as const satisfies Record<string, Record<string, ArgoWizardTooltipDef>>;

export const ARGO_WIZARD_MORE_INFO_BUTTON = 'button[aria-label="More info"]' as const;
