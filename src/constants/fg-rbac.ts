/**
 * RBAC / User Management constants.
 *
 * Organized hierarchically by UI location:
 *   RBAC_ROUTES        -- navigation paths
 *   RBAC_PAGE          -- top-level User Management page
 *   RBAC_USER_DETAIL   -- user detail page (tabs, fields, empty states)
 *   RBAC_RA_TABLE      -- role assignments table (columns, toolbar, row actions, filters)
 *   RBAC_WIZARD        -- role assignment wizard modal (steps, scope, notifications)
 *
 * Workflow constants (used for type safety in page objects):
 *   WIZARD_STEP_IDS, WIZARD_SELECT_IDS, SCOPE_TYPES, GRANULARITY_OPTIONS
 *
 * Backend:
 *   MCRA_RESOURCE      -- MulticlusterRoleAssignment k8s resource definition
 *
 * Verified against stolostron/console release-2.16 via acm-ui MCP.
 */

// =============================================================================
// Routes
// =============================================================================

export const RBAC_ROUTES = {
  identities: '/multicloud/user-management/identities',
  roles: '/multicloud/user-management/roles',

  users: '/multicloud/user-management/identities/users',
  userDetails: (id: string) => `/multicloud/user-management/identities/users/${id}`,
  userRoleAssignments: (id: string) =>
    `/multicloud/user-management/identities/users/${id}/role-assignments`,

  roleDetails: (id: string) => `/multicloud/user-management/roles/${id}`,
  roleRoleAssignments: (id: string) =>
    `/multicloud/user-management/roles/${id}/role-assignments`,
} as const;

// =============================================================================
// User detail page (tabs, fields, navigation, empty states)
//
// Route: /multicloud/user-management/identities/users/:id
// =============================================================================

export const RBAC_USER_DETAIL = {
  tabs: {
    details: 'Details',
    yaml: 'YAML',
    roleAssignments: 'Role assignments',
    groups: 'Groups',
  },
  navigation: {
    backToUsers: 'Back to users',
  },
  fields: {
    generalInformation: 'General information',
    fullName: 'Full name',
    username: 'Username',
    identityProvider: 'Identity Provider',
  },
  emptyStates: {
    groups: {
      title: 'No groups found',
      message: 'This user is not a member of any groups yet.',
    },
  },
} as const;

// =============================================================================
// Role assignments table
//
// Shared across 6 contexts: User, Group, Service Account, Role, Cluster,
// Cluster Set detail pages (each has a "Role assignments" tab).
// Columns: Role, Subject Name, Type, Cluster sets, Clusters, Namespaces,
//          Status, Created
// =============================================================================

export const RBAC_RA_TABLE = {
  columns: {
    role: 'Role',
    subjectName: 'Subject Name',
    type: 'Type',
    clusterSets: 'Cluster sets',
    clusters: 'Clusters',
    namespaces: 'Namespaces',
    status: 'Status',
    created: 'Created',
  },
  toolbar: {
    createButtonId: 'create-role-assignment',
    createButtonLabel: 'Create role assignment',
    bulkDeleteButtonId: 'deleteRoleAssignments',
    searchPlaceholder: 'Search for role assignments...',
  },
  rowActions: {
    kebabAriaLabel: 'Actions',
    editId: 'edit-role-assignment',
    editLabel: 'Edit role assignment',
    deleteId: 'delete-role-assignment',
    deleteLabel: 'Delete role assignment',
  },
  filterIds: {
    role: 'role',
    identity: 'identity',
    clusterSets: 'clusterSets',
    clusters: 'clusters',
    namespace: 'namespace',
    status: 'status',
  },
  emptyState: {
    title: 'No role assignment created yet',
    viewDocumentation: 'View documentation',
  },
  defaults: {
    allNamespaces: 'All namespaces',
  },
} as const;

// =============================================================================
// Role assignment wizard modal (7 steps, 4 entry points)
//
// Opened from: User, Group, SA, Role, Cluster, or Cluster Set detail pages.
// Steps vary by scope type selection and entry point context.
// =============================================================================

export const RBAC_WIZARD = {
  title: 'Create role assignment',
  description:
    'A role assignment specifies a distinct action users or groups can perform when associated with a particular role.',
  learnMore:
    'Learn more about user management, including an example YAML file.',

  scopeInfo: {
    global: 'all current and future resources in all clusters',
    clusterSets: 'all current and future resources on the selected cluster set',
  },

  identities: {
    tabs: {
      users: 'Users',
      groups: 'Groups',
    },
  },

  projects: {
    searchPlaceholder: 'Search projects',
    createButtonId: 'create-project',
    enterProjectName: 'Enter project name',
    enterDisplayName: 'Enter display name (optional)',
    deselectTooltip: 'Deselect projects to create a new common project',
  },

  preAuthorizedUser: {
    identifierPlaceholder: 'user@company.com or username',
    saveButton: 'Save pre-authorized user',
    cancelLink: 'Cancel and search users instead',
    createdNotification: 'Pre-authorized user created',
  },

  viewExamples: {
    link: 'View examples',
    drawerTitle: 'Example scopes',
  },

  notifications: {
    added: 'Role assignment added',
    updated: 'Role assignment updated',
    failed: 'Role assignment creation failed',
    duplicate:
      'This role assignment already exists. Please modify the selection to create a unique assignment.',
  },

  editMode: {
    noChangesAlert: 'No changes have been made. Please modify or cancel to exit.',
  },
} as const;

// =============================================================================
// Wizard step IDs (from RoleAssignmentWizardModal DOM)
// =============================================================================

export const WIZARD_STEP_IDS = {
  scopeSelection: 'scope-selection',
  clusterSetGranularity: 'scope-cluster-set-granularity',
  clusterGranularity: 'scope-cluster-granularity',
  identities: 'identities',
  scope: 'scope',
  role: 'role',
  review: 'review',
} as const;

// =============================================================================
// Wizard select IDs (AcmSelect dropdowns inside wizard steps)
// =============================================================================

export const WIZARD_SELECT_IDS = {
  scopeType: 'scope-type',
  clustersAccessLevel: 'clusters-access-level',
  clusterSetAccessLevel: 'clusters-set-access-level',
} as const;

// =============================================================================
// Scope types
// =============================================================================

export const SCOPE_TYPES = {
  global: 'Global access',
  clusterSets: 'Select cluster sets',
  clusters: 'Select clusters',
} as const;

export type ScopeType = (typeof SCOPE_TYPES)[keyof typeof SCOPE_TYPES];

// =============================================================================
// Granularity options
// =============================================================================

export const GRANULARITY_OPTIONS = {
  clusterSetRoleAssignment: 'Cluster set role assignment',
  clusterRoleAssignment: 'Cluster role assignment',
  projectRoleAssignment: 'Project role assignment',
} as const;

export type GranularityOption = (typeof GRANULARITY_OPTIONS)[keyof typeof GRANULARITY_OPTIONS];

// =============================================================================
// MCRA resource definition (backend)
// =============================================================================

export const MCRA_RESOURCE = {
  apiVersion: 'rbac.open-cluster-management.io/v1beta1',
  kind: 'MulticlusterRoleAssignment',
  namespace: 'open-cluster-management-global-set',
  managedByLabel: 'open-cluster-management.io/managed-by',
  managedByValue: 'console',
  subjectNameLabel: 'rbac.authorization.k8s.io/subject-name',
} as const;
