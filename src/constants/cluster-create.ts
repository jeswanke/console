/**
 * Cluster creation wizard constants.
 *
 * Selectors, element IDs, wizard step labels, and provider metadata
 * for the ACM create-cluster wizard (Hive-based and Hosted).
 */

// =============================================================================
// Routes
// =============================================================================

export const CLUSTER_CREATE_ROUTES = {
  create: '/multicloud/infrastructure/clusters/create',
  controlPlane: '/multicloud/infrastructure/clusters/create/control-plane',
} as const;

// =============================================================================
// Infrastructure providers
// =============================================================================

export const INFRA_PROVIDER_IDS = {
  aws: '#aws',
  gcp: '#google',
  azure: '#azure',
  vmware: '#vsphere',
  openstack: '#openstack',
  hostinventory: '#hostinventory',
  kubevirt: '#kubevirt',
} as const;

export const CONTROL_PLANE_IDS = {
  standalone: '#standalone',
  hosted: '#hosted',
} as const;

// =============================================================================
// Wizard form field selectors (element IDs)
// =============================================================================

export const CLUSTER_WIZARD_FIELDS = {
  // Cluster details step
  credentialDropdown: '#connection-label',
  clusterName: '#eman',
  clusterSet: '#clusterSet-label',
  releaseImage: '#imageSet',
  singleNode: '#singleNode',
  fips: '#fips',

  // Node pools step
  region: '#region-label',
  architecture: '#architecture-label',
  masterPoolSection: '#masterpool-control-plane-pool',
  masterType: '#masterType',
  masterTypeLabel: '#masterType-label',
  workerPoolSection: '#workerpool-worker-pool-1',
  workerType: '#workerType-input',

  // Networking step
  networkType: '#networkType-label',
  clusterNetwork: '#clusterNetwork',
  serviceNetwork: '#serviceNetwork',

  // VMware networking
  vmwareNetworkName: '#networkName',
  vmwareApiVip: '#text-apiVIPs-0',
  vmwareIngressVip: '#text-ingressVIPs-0',
  vmwareMachineCIDR: 'input[id="machineCIDR"]',

  // OpenStack networking
  openstackExternalNetwork: '[data-testid="text-externalNetworkName"]',
  openstackApiFloatingIp: '[data-testid="text-apiFloatingIP"]',
  openstackIngressFloatingIp: '[data-testid="text-ingressFloatingIP"]',

  // KubeVirt cluster details
  kubevirtClusterName: '#clusterName',
  kubevirtReleaseImage: '#releaseImage',
  kubevirtAdditionalLabels: '#additionalLabels',
  kubevirtNodePoolName: 'input[id*="nodePoolName"]',

  // Automation step
  automationTemplate: '#templateName',
} as const;

// =============================================================================
// Wizard navigation
// =============================================================================

export const WIZARD_BUTTONS = {
  next: 'Next',
  back: 'Back',
  create: 'Create',
  cancel: 'Cancel',
} as const;

// =============================================================================
// Provider display names (as shown in wizard)
// =============================================================================

export const PROVIDER_DISPLAY_NAMES = {
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud',
  azure: 'Microsoft Azure',
  azgov: 'Microsoft Azure',
  vmware: 'VMware vSphere',
  openstack: 'Red Hat OpenStack Platform',
  kubevirt: 'Red Hat OpenShift Virtualization',
} as const;

// =============================================================================
// Cluster status values
// =============================================================================

export const CLUSTER_STATUS = {
  ready: 'Ready',
  failed: 'Failed',
  pendingImport: 'Pending import',
  importing: 'Importing',
  creating: 'Creating',
  destroying: 'Destroying',
  hibernating: 'Hibernating',
  resuming: 'Resuming',
  stopping: 'Stopping',
  detached: 'Detached',
} as const;

// =============================================================================
// Row actions (kebab menu on cluster row)
// =============================================================================

export const CLUSTER_ROW_ACTIONS = {
  destroy: '#destroy-cluster',
  detach: '#detach-cluster',
  hibernate: '#hibernate-cluster',
  resume: '#resume-cluster',
  editLabels: '#edit-labels',
  searchCluster: '#search-cluster',
  selectChannel: '#select-channel',
} as const;

// =============================================================================
// Bulk actions (Actions dropdown)
// =============================================================================

export const CLUSTER_BULK_ACTIONS = {
  destroy: '#destroyCluster',
  detach: '#detachCluster',
  hibernate: '#hibernate-cluster',
  resume: '#resume-cluster',
} as const;

// =============================================================================
// Confirmation modal
// =============================================================================

export const CLUSTER_MODAL = {
  confirmInput: '#confirm',
} as const;

// =============================================================================
// Label constants
// =============================================================================

export const CLUSTER_LABEL_KEYS = {
  cloud: 'cloud',
  vendor: 'vendor',
  name: 'name',
  clcClusterType: 'clc-cluster-type',
} as const;

/** ACM auto-applied `cloud=` label values per provider (set by Hive/ACM, not by us). */
export const PROVIDER_CLOUD_LABEL: Record<string, string> = {
  aws: 'Amazon',
  gcp: 'Google',
  azure: 'Azure',
  azgov: 'Azure',
  vmware: 'vSphere',
  openstack: 'OpenStack',
  kubevirt: 'BareMetal',
} as const;
