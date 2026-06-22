/** RHACM4K-41355 — subscription-admin placementrules topology fixture (CLI apply). */

export const APP_SUBSCRIPTION_ADMIN_PLACEMENTRULES = {
  applicationName: 'api-git-placementrules',
  namespace: 'api-git-placementrules-ns',
  nsTemplateRelativePath: 'src/templates/app/subscription-api/git-placementrules-ns.yaml',
  appTemplateRelativePath: 'src/templates/app/subscription-api/git-placementrules.yaml',
  rbacUser: 'app-test-cluster-manager-admin',
  rbacIdp: 'app-e2e-htpasswd',
  /** Topology drawer rows: namespace column for placement5/6 should reference placement1. */
  placementRuleRows: [
    { placementRuleName: 'placement6', expectedNamespace: 'placement1' },
    { placementRuleName: 'placement5', expectedNamespace: 'placement1' },
  ],
} as const;
