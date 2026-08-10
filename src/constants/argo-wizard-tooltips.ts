/** Argo ApplicationSet pull-model wizard **More info** tooltips (RHACM4K-61725). */

export type ArgoWizardTooltipDef = {
  helpButtonSelector: string;
  popoverBodySelector: string;
  expectedText: string | string[];
  /** Label text near the help button; used when element IDs are unreliable (generator fields). */
  nearLabelText?: string;
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
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText:
        'Sets the time delay in seconds before the application set controller triggers a refresh of the cluster resource decision generator to detect placement decision changes and update the resulting applications.',
      nearLabelText: 'Requeue time',
    },
    clustersMatchLabels: {
      helpButtonSelector: '[id$="matchLabels-label-help-button"]',
      popoverBodySelector: '[id$="matchLabels-label-help-popover-body"]',
      expectedText: 'Labels to match clusters by',
    },
    gitRepoUrl: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'The URL path for the Git repository.',
      nearLabelText: 'URL',
    },
    gitRevision: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'Refer to a single commit',
      nearLabelText: 'Revision',
    },
    gitRequeue: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'Git requeue time in seconds',
      nearLabelText: 'Requeue time',
    },
    pluginInputParams: {
      helpButtonSelector: '[id$="plugin.input.parameters-label-help-button"]',
      popoverBodySelector: '[id$="plugin.input.parameters-label-help-popover-body"]',
      expectedText: 'Key-value parameters to pass to the plugin',
    },
    pluginValues: {
      helpButtonSelector: '[id$="plugin.values-label-help-button"]',
      popoverBodySelector: '[id$="plugin.values-label-help-popover-body"]',
      expectedText: 'Values to include in the generated parameters',
    },
    pluginRequeue: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'Plugin requeue time in seconds',
      nearLabelText: 'Requeue time',
    },
    pullRequestRequeue: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'Pull request requeue time in seconds',
      nearLabelText: 'Requeue time',
    },
  },
  repository: {
    gitRepoUrl: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'The URL path for the Git repository',
      nearLabelText: 'URL',
    },
    targetRevision: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'Refer to a single commit',
      nearLabelText: 'Revision',
    },
    path: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'The location of the resources on the Git repository',
      nearLabelText: 'Path',
    },
    helmRepoUrl: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'The URL path for the Helm repository',
      nearLabelText: 'URL',
    },
    chart: {
      helpButtonSelector: '[id$="chart-label-help-button"]',
      popoverBodySelector: '[id$="chart-label-help-popover-body"]',
      expectedText: 'The specific name for the target Helm chart',
    },
    helmTargetRevision: {
      helpButtonSelector: '[id$="targetRevision-label-help-button"]',
      popoverBodySelector: '[id$="targetRevision-label-help-popover-body"]',
      expectedText: 'The version or versions for the deployable',
    },
  },
  syncPolicy: {
    prune: {
      helpButtonSelector: '[id$="syncPolicy.automated.prune-label-help-button"]',
      popoverBodySelector: '[id$="syncPolicy.automated.prune-label-help-popover-body"]',
      expectedText: 'If automated sync is disabled, this option will be ignored.',
    },
    allowEmpty: {
      helpButtonSelector: '[id$="syncPolicy.automated.allowEmpty-label-help-button"]',
      popoverBodySelector: '[id$="syncPolicy.automated.allowEmpty-label-help-popover-body"]',
      expectedText: 'If automated sync is disabled, this option will be ignored.',
    },
    selfHeal: {
      helpButtonSelector: '[id$="syncPolicy.automated.selfHeal-label-help-button"]',
      popoverBodySelector: '[id$="syncPolicy.automated.selfHeal-label-help-popover-body"]',
      expectedText: 'If automated sync is disabled, this option will be ignored.',
    },
  },
  placement: {
    clusterSets: {
      helpButtonSelector: '[id$="-label-help-button"]',
      popoverBodySelector: '[id$="-label-help-popover-body"]',
      expectedText: 'Select cluster sets from which to select clusters',
      nearLabelText: 'Cluster sets',
    },
  },
} as const satisfies Record<string, Record<string, ArgoWizardTooltipDef>>;

export const ARGO_WIZARD_MORE_INFO_BUTTON = 'button[aria-label="More info"]' as const;
