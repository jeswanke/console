/**
 * Shared defaults when environment variables are unset.
 */

export const hubAuthPresets = {
  hubUser: 'kubeadmin',
  hubIdp: 'kube:admin',
} as const;

/**
 * RBAC test users aligned with gen-rbac.sh user arrays.
 * Grouped by VIRT_TIER: rbac-ui users are always created,
 * vm users added on BM/Azure, cclm users added on Azure only.
 */
export const rbacPresets = {
  defaultIdp: 'clc-e2e-htpasswd',
  users: [
    // --- Tier: rbac-ui (RBAC wizard/role tests, no Fleet UI) ---
    { role: 'fg-rbac-edit-test-60303', username: 'clc-e2e-edit-test-60303', domains: ['fg-rbac'] },
    { role: 'fg-rbac-hub-view-60310', username: 'clc-e2e-hub-view-60310', domains: ['fg-rbac'] },
    { role: 'fg-rbac-edgecase-61736', username: 'clc-e2e-edgecase-61736', domains: ['fg-rbac'] },
    { role: 'fg-rbac-edgecase-61735', username: 'clc-e2e-edgecase-61735', domains: ['fg-rbac'] },
    { role: 'fg-rbac-edgecase-61779', username: 'clc-e2e-edgecase-61779', domains: ['fg-rbac'] },
    { role: 'fg-rbac-clusterset-61863', username: 'clc-e2e-clusterset-61863', domains: ['fg-rbac'] },
    { role: 'fg-rbac-edit-61823', username: 'clc-e2e-edit-61823', domains: ['fg-rbac'] },
    { role: 'fg-rbac-global-61726', username: 'clc-e2e-global-61726', domains: ['fg-rbac'] },
    { role: 'fg-rbac-csfull-61727', username: 'clc-e2e-csfull-61727', domains: ['fg-rbac'] },
    { role: 'fg-rbac-csproj-61728', username: 'clc-e2e-csproj-61728', domains: ['fg-rbac'] },
    { role: 'fg-rbac-csfull-61729', username: 'clc-e2e-csfull-61729', domains: ['fg-rbac'] },
    { role: 'fg-rbac-csproj-61730', username: 'clc-e2e-csproj-61730', domains: ['fg-rbac'] },
    { role: 'fg-rbac-clfull-61731', username: 'clc-e2e-clfull-61731', domains: ['fg-rbac'] },
    { role: 'fg-rbac-clproj-61732', username: 'clc-e2e-clproj-61732', domains: ['fg-rbac'] },
    { role: 'fg-rbac-clfull-61733', username: 'clc-e2e-clfull-61733', domains: ['fg-rbac'] },
    { role: 'fg-rbac-clproj-61734', username: 'clc-e2e-clproj-61734', domains: ['fg-rbac'] },
    { role: 'fg-rbac-reviewdiff-61825', username: 'clc-e2e-reviewdiff-61825', domains: ['fg-rbac'] },
    { role: 'fg-rbac-rolespage-61856', username: 'clc-e2e-rolespage-61856', domains: ['fg-rbac'] },
    { role: 'fg-rbac-clpage-61862', username: 'clc-e2e-clpage-61862', domains: ['fg-rbac'] },
    { role: 'fg-rbac-dupra-61864', username: 'clc-e2e-dupra-61864', domains: ['fg-rbac'] },
    { role: 'fg-rbac-projmismatch-61865', username: 'clc-e2e-projmismatch-61865', domains: ['fg-rbac'] },
    { role: 'fg-rbac-delete-61866', username: 'clc-e2e-delete-61866', domains: ['fg-rbac'] },
    { role: 'fg-rbac-cpadvanced-61867', username: 'clc-e2e-cpadvanced-61867', domains: ['fg-rbac'] },
    { role: 'fg-rbac-scopechange-61944', username: 'clc-e2e-scopechange-61944', domains: ['fg-rbac'] },
    { role: 'fg-rbac-preauth-61797', username: 'clc-e2e-preauth-61797', domains: ['fg-rbac'] },
    { role: 'fg-rbac-del-60255', username: 'clc-e2e-del-60255', domains: ['fg-rbac'] },

    // --- Tier: vm (Fleet UI tests, needs CNV) ---
    { role: 'fg-rbac-std-view-60309', username: 'clc-e2e-std-view-60309', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-std-edit-60309', username: 'clc-e2e-std-edit-60309', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-std-admin-60309', username: 'clc-e2e-std-admin-60309', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-hub-view-only-60310', username: 'clc-e2e-hub-view-only-60310', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-hub-admin-60311', username: 'clc-e2e-hub-admin-60311', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-managed-view-60467', username: 'clc-e2e-managed-view-60467', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-managed-admin-60468', username: 'clc-e2e-managed-admin-60468', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-spoke-view-ns-60302-60306', username: 'clc-e2e-spoke-view-ns-60302-60306', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-group-last-60307', username: 'clc-e2e-group-last-60307', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-idp-kubevirt-60257', username: 'clc-e2e-idp-kubevirt-60257', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-idp-vm-60258', username: 'clc-e2e-idp-vm-60258', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-search-61846', username: 'clc-e2e-search-61846', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-view-cluster-59195', username: 'clc-e2e-view-cluster-59195', domains: ['fg-rbac', 'fleet-virt'] },
    { role: 'fg-rbac-operator-60239', username: 'clc-e2e-operator-60239', domains: ['fg-rbac', 'fleet-virt'] },

    // --- Tier: full (CCLM tests, Azure only) ---
    { role: 'fg-rbac-cclm-view', username: 'clc-e2e-cclm-view', domains: ['fg-rbac', 'fleet-virt'] },  // TODO: assign Polarion ID
    { role: 'fg-rbac-cclm-admin-60989', username: 'clc-e2e-cclm-admin-60989', domains: ['fg-rbac', 'fleet-virt'] },
  ],
} as const;
