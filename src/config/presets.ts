/**
 * Shared defaults when environment variables are unset.
 */

export const hubAuthPresets = {
  hubUser: 'kubeadmin',
  hubIdp: 'kube:admin',
} as const;

export const rbacPresets = {
  idp: 'clc-e2e-htpasswd',
  users: [
    { role: 'fg-rbac-admin', username: 'clc-e2e-fg-rbac-admin', domains: ['fg-rbac'] },
    { role: 'fg-rbac-view', username: 'clc-e2e-fg-rbac-view', domains: ['fg-rbac'] },
  ],
} as const;
