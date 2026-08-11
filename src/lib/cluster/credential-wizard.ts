/**
 * High-level orchestration for the ACM credential create wizard.
 *
 * Each provider follows the same general flow:
 *   1. Select provider type
 *   2. Fill basic information (name, namespace, base domain)
 *   3. Fill provider-specific credential fields
 *   4. Skip proxy (accept defaults)
 *   5. Fill pull secret & SSH keys
 *   6. Click Add on review step
 *
 * Provider-specific differences (extra steps, different fields) are handled
 * by branching within this orchestration.
 */
import type { CredentialWizardPage } from '@pages/cluster/CredentialWizardPage';
import type { CredentialsListPage } from '@pages/cluster/CredentialsListPage';
import type { ClcConfig, ClcProvider } from '@config';

export interface CreateCredentialOptions {
  provider: ClcProvider;
  name: string;
  namespace: string;
  config: ClcConfig;
}

export async function fillCredentialWizard(
  credentialsListPage: CredentialsListPage,
  wizard: CredentialWizardPage,
  options: CreateCredentialOptions
): Promise<void> {
  const { provider, name, namespace, config } = options;

  await credentialsListPage.clickAddCredential();

  switch (provider) {
    case 'aws':
      await createAwsCredential(wizard, name, namespace, config);
      break;
    case 'gcp':
      await createGcpCredential(wizard, name, namespace, config);
      break;
    case 'azure':
    case 'azgov':
      await createAzureCredential(wizard, name, namespace, config, provider);
      break;
    case 'vmware':
      await createVmwareCredential(wizard, name, namespace, config);
      break;
    case 'openstack':
      await createOpenstackCredential(wizard, name, namespace, config);
      break;
    case 'kubevirt':
      await createKubevirtCredential(wizard, name, namespace, config);
      break;
  }
}

// =============================================================================
// AWS
// =============================================================================

async function createAwsCredential(
  wizard: CredentialWizardPage,
  name: string,
  namespace: string,
  config: ClcConfig
): Promise<void> {
  const aws = config.aws;
  if (!aws) throw new Error('AWS credential config not available');

  await wizard.selectProvider('aws');
  await wizard.fillBasicInfo({ name, namespace, baseDomain: aws.baseDomain });
  await wizard.fillAwsCreds(aws.accessKeyId, aws.secretAccessKey);
  await wizard.skipProxy();
  await wizard.fillPullSecretAndSshKeys({
    pullSecret: config.shared.pullSecret,
    sshPrivateKey: config.shared.sshPrivateKey,
    sshPublicKey: config.shared.sshPublicKey,
  });
  await wizard.clickAdd();
}

// =============================================================================
// GCP
// =============================================================================

async function createGcpCredential(
  wizard: CredentialWizardPage,
  name: string,
  namespace: string,
  config: ClcConfig
): Promise<void> {
  const gcp = config.gcp;
  if (!gcp) throw new Error('GCP credential config not available');

  await wizard.selectProvider('gcp');
  await wizard.fillBasicInfo({ name, namespace, baseDomain: gcp.baseDomain });
  await wizard.fillGcpCreds(gcp.projectId, gcp.serviceAccountJson);
  await wizard.skipProxy();
  await wizard.fillPullSecretAndSshKeys({
    pullSecret: config.shared.pullSecret,
    sshPrivateKey: config.shared.sshPrivateKey,
    sshPublicKey: config.shared.sshPublicKey,
  });
  await wizard.clickAdd();
}

// =============================================================================
// Azure / Azure Government
// =============================================================================

async function createAzureCredential(
  wizard: CredentialWizardPage,
  name: string,
  namespace: string,
  config: ClcConfig,
  provider: 'azure' | 'azgov'
): Promise<void> {
  const cred = config[provider];
  if (!cred) throw new Error(`${provider} credential config not available`);

  await wizard.selectProvider('azure');
  await wizard.fillBasicInfo({
    name,
    namespace,
    baseDomain: cred.baseDomain,
    azureCloudName: cred.cloudName,
  });
  await wizard.fillAzureCreds({
    baseDomainResourceGroup: cred.baseDomainResourceGroup,
    clientId: cred.clientId,
    clientSecret: cred.clientSecret,
    subscriptionId: cred.subscriptionId,
    tenantId: cred.tenantId,
  });
  await wizard.skipProxy();
  await wizard.fillPullSecretAndSshKeys({
    pullSecret: config.shared.pullSecret,
    sshPrivateKey: config.shared.sshPrivateKey,
    sshPublicKey: config.shared.sshPublicKey,
  });
  await wizard.clickAdd();
}

// =============================================================================
// VMware
// =============================================================================

async function createVmwareCredential(
  wizard: CredentialWizardPage,
  name: string,
  namespace: string,
  config: ClcConfig
): Promise<void> {
  const vmw = config.vmware;
  if (!vmw) throw new Error('VMware credential config not available');

  await wizard.selectProvider('vmware');
  await wizard.fillBasicInfo({ name, namespace, baseDomain: vmw.baseDomain });
  await wizard.fillVmwareCreds({
    vCenter: vmw.vCenter,
    username: vmw.username,
    password: vmw.password,
    caCertificate: vmw.caCertificate,
    cluster: vmw.cluster,
    datacenter: vmw.datacenter,
    datastore: vmw.datastore,
  });
  await wizard.skipDisconnectedInstall();
  await wizard.skipProxy();
  await wizard.fillPullSecretAndSshKeys({
    pullSecret: config.shared.pullSecret,
    sshPrivateKey: config.shared.sshPrivateKey,
    sshPublicKey: config.shared.sshPublicKey,
  });
  await wizard.clickAdd();
}

// =============================================================================
// OpenStack
// =============================================================================

async function createOpenstackCredential(
  wizard: CredentialWizardPage,
  name: string,
  namespace: string,
  config: ClcConfig
): Promise<void> {
  const os = config.openstack;
  if (!os) throw new Error('OpenStack credential config not available');

  await wizard.selectProvider('openstack');
  await wizard.fillBasicInfo({ name, namespace, baseDomain: os.baseDomain });
  await wizard.fillOpenstackCreds({
    cloudsYaml: os.cloudsYaml,
    cloudName: os.cloudName,
  });
  await wizard.skipDisconnectedInstall();
  await wizard.skipProxy();
  await wizard.fillPullSecretAndSshKeys({
    pullSecret: config.shared.pullSecret,
    sshPrivateKey: config.shared.sshPrivateKey,
    sshPublicKey: config.shared.sshPublicKey,
  });
  await wizard.clickAdd();
}

// =============================================================================
// KubeVirt — minimal wizard (no provider-specific cred step)
// =============================================================================

async function createKubevirtCredential(
  wizard: CredentialWizardPage,
  name: string,
  namespace: string,
  config: ClcConfig
): Promise<void> {
  await wizard.selectProvider('kubevirt');
  await wizard.fillBasicInfo({ name, namespace });
  await wizard.fillPullSecretAndSshKeys({
    pullSecret: config.shared.pullSecret,
    sshPublicKey: config.shared.sshPublicKey,
  });
  await wizard.clickAdd();
}
