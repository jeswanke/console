/**
 * Configuration types for hub auth and area-specific runtime options.
 *
 * Values are loaded by per-area getters in index.ts.
 * Tests receive config via fixtures, never via process.env directly.
 */

export interface HubAuthConfig {
  readonly hubUser: string;
  readonly hubPassword: string;
  readonly hubIdp: string;
}

export interface RbacUser {
  readonly role: string;
  readonly username: string;
  readonly password: string;
  readonly idp: string;
  readonly domains: readonly string[];
}

export interface RbacConfig {
  readonly idpName: string;
  readonly spokeCluster: string;
  readonly users: Readonly<Record<string, string>>;
}

export interface VirtConfig {
  readonly spokeCluster: string;
}

export interface TestConfig {
  readonly hub: HubAuthConfig;
}

// =============================================================================
// CLC (Cluster Lifecycle) — cloud provider credentials & cluster parameters
// =============================================================================

export type ClcProvider = 'aws' | 'gcp' | 'azure' | 'azgov' | 'vmware' | 'openstack' | 'kubevirt';

export interface ClcSharedSecrets {
  readonly pullSecret: string;
  readonly sshPrivateKey: string;
  readonly sshPublicKey: string;
}

export interface ClcOcpRelease {
  readonly version: string;
  readonly arch: string;
  readonly registry: string;
  /** Fully resolved image reference (registry:version-arch). */
  readonly releaseImage: string;
}

export interface ClcAwsCredential {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly baseDomain: string;
}

export interface ClcGcpCredential {
  readonly projectId: string;
  readonly serviceAccountJson: string;
  readonly baseDomain: string;
}

export interface ClcAzureCredential {
  readonly baseDomainResourceGroup: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tenantId: string;
  readonly subscriptionId: string;
  readonly baseDomain: string;
  readonly cloudName: string;
}

export interface ClcVmwareCredential {
  readonly vCenter: string;
  readonly username: string;
  readonly password: string;
  readonly caCertificate: string;
  readonly cluster: string;
  readonly datacenter: string;
  readonly datastore: string;
  readonly baseDomain: string;
}

export interface ClcOpenstackCredential {
  readonly cloudsYaml: string;
  readonly cloudName: string;
  readonly baseDomain: string;
  readonly clusterOsImage: string;
}

export interface ClcKubevirtCredential {
  readonly namespace: string;
}

export interface ClcConfig {
  readonly shared: ClcSharedSecrets;
  readonly ocpRelease: ClcOcpRelease;
  readonly aws?: ClcAwsCredential;
  readonly gcp?: ClcGcpCredential;
  readonly azure?: ClcAzureCredential;
  readonly azgov?: ClcAzureCredential;
  readonly vmware?: ClcVmwareCredential;
  readonly openstack?: ClcOpenstackCredential;
  readonly kubevirt?: ClcKubevirtCredential;
}
