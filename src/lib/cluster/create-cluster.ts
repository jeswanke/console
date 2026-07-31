/**
 * High-level orchestration for the ACM create-cluster wizard.
 *
 * Each provider follows the same general flow:
 *   1. Select infrastructure provider
 *   2. Fill cluster details (credential, name, cluster set, release image)
 *   3. Fill node pools (region, instance types)
 *   4. Fill networking
 *   5. Skip proxy / disconnected / automation (defaults)
 *   6. Click Create → verify redirect to cluster overview
 *
 * Provider-specific differences are handled by branching within this orchestration.
 */
import type { CreateClusterWizardPage } from '@pages/cluster/CreateClusterWizardPage';
import type { ClusterListPage } from '@pages/cluster/ClusterListPage';
import type { ClusterCreateParamsPayload } from '@config';
import type { ClcOcpRelease } from '../../config/schema';

export interface CreateClusterOptions {
  cluster: ClusterCreateParamsPayload;
  credentialName: string;
  clusterName: string;
  ocpRelease: ClcOcpRelease;
}

/**
 * Navigates from the cluster list through the full create-cluster wizard.
 * Expects the page to already be on the cluster list.
 */
export async function fillCreateClusterWizard(
  clusterListPage: ClusterListPage,
  wizard: CreateClusterWizardPage,
  options: CreateClusterOptions
): Promise<void> {
  const { cluster, credentialName, clusterName, ocpRelease } = options;

  await clusterListPage.clickCreate();

  await wizard.selectProvider(cluster.provider);

  switch (cluster.provider) {
    case 'aws':
    case 'gcp':
    case 'azure':
    case 'azgov':
      await fillStandaloneCloudWizard(wizard, cluster, credentialName, clusterName, ocpRelease);
      break;
    case 'vmware':
      await fillVmwareWizard(wizard, cluster, credentialName, clusterName, ocpRelease);
      break;
    case 'openstack':
      await fillOpenstackWizard(wizard, cluster, credentialName, clusterName, ocpRelease);
      break;
    case 'kubevirt':
      await fillKubevirtWizard(wizard, cluster, credentialName, clusterName, ocpRelease);
      break;
  }
}

// =============================================================================
// Shared — cluster details step (credential, name, set, FIPS, release, labels)
// =============================================================================

async function fillClusterDetailsStep(
  wizard: CreateClusterWizardPage,
  cluster: ClusterCreateParamsPayload,
  credentialName: string,
  clusterName: string,
  ocpRelease: ClcOcpRelease
): Promise<void> {
  await wizard.selectCredential(credentialName);
  await wizard.fillClusterName(clusterName);
  if (cluster.clusterSet) {
    await wizard.selectClusterSet(cluster.clusterSet);
  }
  if (cluster.fips) {
    await wizard.enableFips();
  }
  await wizard.selectReleaseImage(ocpRelease.version);
  if (cluster.additionalLabels && Object.keys(cluster.additionalLabels).length > 0) {
    await wizard.fillAdditionalLabels(cluster.additionalLabels);
  }
  await wizard.clickNext();
}

// =============================================================================
// AWS / GCP / Azure / Azure Gov — standard cloud provider wizard
// =============================================================================

async function fillStandaloneCloudWizard(
  wizard: CreateClusterWizardPage,
  cluster: ClusterCreateParamsPayload,
  credentialName: string,
  clusterName: string,
  ocpRelease: ClcOcpRelease
): Promise<void> {
  await fillClusterDetailsStep(wizard, cluster, credentialName, clusterName, ocpRelease);

  // Step: Node pools
  if (cluster.region) {
    await wizard.selectRegion(cluster.region);
  }
  if (cluster.architecture) {
    await wizard.selectArchitecture(cluster.architecture);
  }
  if (cluster.masterInstanceType) {
    await wizard.fillMasterInstanceType(cluster.masterInstanceType);
  }
  if (cluster.workerInstanceType) {
    await wizard.fillWorkerInstanceType(cluster.workerInstanceType);
  }
  await wizard.clickNext();

  // Step: Networking
  await wizard.fillNetworkingDetails({
    networkType: cluster.networkType,
    clusterNetworkCIDR: cluster.clusterNetworkCIDR,
    serviceNetworkCIDR: cluster.serviceNetworkCIDR,
  });
  await wizard.clickNext();

  // Step: Proxy (skip — accept defaults)
  await wizard.clickNext();

  // Step: AWS Private config (AWS only)
  if (cluster.provider === 'aws') {
    await wizard.clickNext();
  }

  // Step: Automation (skip)
  await wizard.clickNext();

  // Step: Review → Create
  await wizard.clickCreate();
  await wizard.expectOnOverviewPage(clusterName);
}

// =============================================================================
// VMware — has custom networking step
// =============================================================================

async function fillVmwareWizard(
  wizard: CreateClusterWizardPage,
  cluster: ClusterCreateParamsPayload,
  credentialName: string,
  clusterName: string,
  ocpRelease: ClcOcpRelease
): Promise<void> {
  await fillClusterDetailsStep(wizard, cluster, credentialName, clusterName, ocpRelease);

  // Step: Node pools (no region for VMware, just accept defaults)
  await wizard.clickNext();

  // Step: Networking (VMware-specific)
  if (cluster.network && cluster.apiVIP && cluster.ingressVIP) {
    await wizard.fillVmwareNetworking({
      network: cluster.network,
      apiVIP: cluster.apiVIP,
      ingressVIP: cluster.ingressVIP,
      machineCIDR: cluster.machineCIDR,
    });
  }
  await wizard.clickNext();

  // Step: Proxy (skip)
  await wizard.clickNext();

  // Step: Disconnected install (skip)
  await wizard.clickNext();

  // Step: Automation (skip)
  await wizard.clickNext();

  // Step: Review → Create
  await wizard.clickCreate();
  await wizard.expectOnOverviewPage(clusterName);
}

// =============================================================================
// OpenStack — has custom networking step
// =============================================================================

async function fillOpenstackWizard(
  wizard: CreateClusterWizardPage,
  cluster: ClusterCreateParamsPayload,
  credentialName: string,
  clusterName: string,
  ocpRelease: ClcOcpRelease
): Promise<void> {
  await fillClusterDetailsStep(wizard, cluster, credentialName, clusterName, ocpRelease);

  // Step: Node pools
  if (cluster.architecture) {
    await wizard.selectArchitecture(cluster.architecture);
  }
  await wizard.clickNext();

  // Step: Networking (OpenStack-specific)
  if (cluster.externalNetwork && cluster.apiFIP && cluster.ingressFIP) {
    await wizard.fillOpenstackNetworking({
      externalNetwork: cluster.externalNetwork,
      apiFloatingIp: cluster.apiFIP,
      ingressFloatingIp: cluster.ingressFIP,
      networkType: cluster.networkType,
      machineCIDR: cluster.machineCIDR,
    });
  }
  await wizard.clickNext();

  // Step: Proxy (skip)
  await wizard.clickNext();

  // Step: Disconnected install (skip)
  await wizard.clickNext();

  // Step: Automation (skip)
  await wizard.clickNext();

  // Step: Review → Create
  await wizard.clickCreate();
  await wizard.expectOnOverviewPage(clusterName);
}

// =============================================================================
// KubeVirt (Hosted Control Plane) — different wizard flow
// =============================================================================

async function fillKubevirtWizard(
  wizard: CreateClusterWizardPage,
  cluster: ClusterCreateParamsPayload,
  credentialName: string,
  clusterName: string,
  ocpRelease: ClcOcpRelease
): Promise<void> {
  // Step: Cluster details (KubeVirt hosted uses different field IDs)
  await wizard.selectCredential(credentialName);
  await wizard.fillKubevirtClusterName(clusterName);
  if (cluster.clusterSet) {
    await wizard.selectClusterSet(cluster.clusterSet);
  }
  await wizard.selectKubevirtReleaseImage(ocpRelease.version);
  if (cluster.additionalLabels && Object.keys(cluster.additionalLabels).length > 0) {
    await wizard.fillKubevirtAdditionalLabels(cluster.additionalLabels);
  }
  await wizard.clickNext();

  // Step: Node pools
  await wizard.fillKubevirtNodePoolName(`${clusterName}-np`);
  await wizard.clickNext();

  // Step: Review → Create
  await wizard.clickCreate();
  await wizard.expectOnOverviewPage(clusterName);
}
