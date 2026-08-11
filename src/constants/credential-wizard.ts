/**
 * Credential wizard constants.
 *
 * Selectors, element IDs, wizard step labels, and provider metadata
 * for the ACM credential create/edit wizard and credentials list page.
 */

// =============================================================================
// Routes
// =============================================================================

export const CREDENTIAL_ROUTES = {
  list: '/multicloud/credentials',
  create: '/multicloud/credentials/create',
} as const;

// =============================================================================
// Provider type cards (credential create wizard — first step)
// =============================================================================

export const CREDENTIAL_PROVIDER_IDS = {
  aws: '#aws',
  awsStandard: '#aws-standard',
  gcp: '#google',
  azure: '#azure',
  vmware: '#vsphere',
  openstack: '#openstack',
  kubevirt: '#kubevirt',
} as const;

// =============================================================================
// Wizard form field selectors (element IDs)
// =============================================================================

export const CREDENTIAL_WIZARD_FIELDS = {
  // Basic information step
  credentialsName: '#credentialsName',
  baseDomain: '#baseDomain',

  // AWS provider credentials
  awsAccessKeyId: '#aws_access_key_id',
  awsSecretAccessKey: '#aws_secret_access_key',

  // GCP provider credentials
  gcpProjectId: '#projectID',
  gcpServiceAccountJson: '#osServiceAccount\\.json',

  // Azure provider credentials
  azureCloudName: '#azureCloudName',
  azureBaseDomainResourceGroup: '#baseDomainResourceGroupName',
  azureClientId: '#clientId',
  azureClientSecret: '#clientSecret',
  azureSubscriptionId: '#subscriptionId',
  azureTenantId: '#tenantId',

  // VMware provider credentials
  vmwareVcenter: '#vCenter',
  vmwareUsername: '#username',
  vmwarePassword: '#password',
  vmwareCaCertificate: '#cacertificate',
  vmwareCluster: '#cluster',
  vmwareDatacenter: '#datacenter',
  vmwareDatastore: '#defaultDatastore',

  // OpenStack provider credentials
  openstackCloudName: '#cloud',
  openstackCaCert: '#os_ca_bundle',

  // Common secrets (pull secret / SSH keys step)
  pullSecret: '#pullSecret',
  sshPrivateKey: '#ssh-privatekey',
  sshPublicKey: '#ssh-publickey',
} as const;

// =============================================================================
// Wizard navigation
// =============================================================================

export const CREDENTIAL_WIZARD_BUTTONS = {
  next: 'Next',
  back: 'Back',
  add: 'Add',
  save: 'Save',
  cancel: 'Cancel',
} as const;

// =============================================================================
// Credentials list page — row actions
// =============================================================================

export const CREDENTIAL_ROW_ACTIONS = {
  edit: '#editConnection',
  delete: '#deleteConnection',
} as const;

// =============================================================================
// Credentials list page — bulk actions
// =============================================================================

export const CREDENTIAL_BULK_ACTIONS = {
  actionsDropdown: '#table-actions-dropdown',
  delete: '#deleteConnection',
} as const;

// =============================================================================
// Provider display names (as shown in credential wizard)
// =============================================================================

export const CREDENTIAL_PROVIDER_DISPLAY_NAMES = {
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud Platform',
  azure: 'Microsoft Azure',
  vmware: 'VMware vSphere',
  openstack: 'Red Hat OpenStack Platform',
  kubevirt: 'Red Hat OpenShift Virtualization',
} as const;
