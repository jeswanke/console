/**
 * Hybrid credential setup — creates ACM provider credential Secrets via `oc apply`.
 *
 * Each provider credential is a Kubernetes Secret in a dedicated namespace with
 * specific labels that ACM uses to identify it as a cloud connection.
 */
import type { OcCliService } from '@services/OcCliService';
import type { ClcConfig, ClcProvider } from '@config';
import type { ClusterCreateCredentialPayload } from '@config';

const ACM_CREDENTIAL_LABEL = 'cluster.open-cluster-management.io/credentials';
const ACM_CREDENTIAL_TYPE = 'cluster.open-cluster-management.io/type';

interface CredentialSecretData {
  [key: string]: string;
}

function base64(value: string): string {
  return Buffer.from(value).toString('base64');
}

function buildAwsSecretData(config: ClcConfig): CredentialSecretData {
  const aws = config.aws;
  if (!aws) throw new Error('CLC AWS credential env vars not configured');
  return {
    aws_access_key_id: base64(aws.accessKeyId),
    aws_secret_access_key: base64(aws.secretAccessKey),
    baseDomain: base64(aws.baseDomain),
    pullSecret: base64(config.shared.pullSecret),
    'ssh-privatekey': base64(config.shared.sshPrivateKey),
    'ssh-publickey': base64(config.shared.sshPublicKey),
    httpProxy: base64(''),
    httpsProxy: base64(''),
    noProxy: base64(''),
    additionalTrustBundle: base64(''),
  };
}

function buildGcpSecretData(config: ClcConfig): CredentialSecretData {
  const gcp = config.gcp;
  if (!gcp) throw new Error('CLC GCP credential env vars not configured');
  return {
    projectID: base64(gcp.projectId),
    'osServiceAccount.json': base64(gcp.serviceAccountJson),
    baseDomain: base64(gcp.baseDomain),
    pullSecret: base64(config.shared.pullSecret),
    'ssh-privatekey': base64(config.shared.sshPrivateKey),
    'ssh-publickey': base64(config.shared.sshPublicKey),
    httpProxy: base64(''),
    httpsProxy: base64(''),
    noProxy: base64(''),
    additionalTrustBundle: base64(''),
  };
}

function buildAzureSecretData(
  config: ClcConfig,
  provider: 'azure' | 'azgov',
): CredentialSecretData {
  const cred = config[provider];
  if (!cred) throw new Error(`CLC ${provider} credential env vars not configured`);
  const spJson = JSON.stringify({
    clientId: cred.clientId,
    clientSecret: cred.clientSecret,
    tenantId: cred.tenantId,
    subscriptionId: cred.subscriptionId,
  });
  return {
    'osServicePrincipal.json': base64(spJson),
    baseDomainResourceGroupName: base64(cred.baseDomainResourceGroup),
    cloudName: base64(cred.cloudName),
    baseDomain: base64(cred.baseDomain),
    pullSecret: base64(config.shared.pullSecret),
    'ssh-privatekey': base64(config.shared.sshPrivateKey),
    'ssh-publickey': base64(config.shared.sshPublicKey),
    httpProxy: base64(''),
    httpsProxy: base64(''),
    noProxy: base64(''),
    additionalTrustBundle: base64(''),
  };
}

function buildVmwareSecretData(config: ClcConfig): CredentialSecretData {
  const vmw = config.vmware;
  if (!vmw) throw new Error('CLC VMware credential env vars not configured');
  return {
    vCenter: base64(vmw.vCenter),
    username: base64(vmw.username),
    password: base64(vmw.password),
    cacertificate: base64(vmw.caCertificate),
    cluster: base64(vmw.cluster),
    datacenter: base64(vmw.datacenter),
    defaultDatastore: base64(vmw.datastore),
    baseDomain: base64(vmw.baseDomain),
    pullSecret: base64(config.shared.pullSecret),
    'ssh-privatekey': base64(config.shared.sshPrivateKey),
    'ssh-publickey': base64(config.shared.sshPublicKey),
    httpProxy: base64(''),
    httpsProxy: base64(''),
    noProxy: base64(''),
    additionalTrustBundle: base64(''),
  };
}

function buildOpenstackSecretData(config: ClcConfig): CredentialSecretData {
  const os = config.openstack;
  if (!os) throw new Error('CLC OpenStack credential env vars not configured');
  return {
    'clouds.yaml': base64(os.cloudsYaml),
    cloud: base64(os.cloudName),
    clusterOSImage: base64(os.clusterOsImage),
    baseDomain: base64(os.baseDomain),
    pullSecret: base64(config.shared.pullSecret),
    'ssh-privatekey': base64(config.shared.sshPrivateKey),
    'ssh-publickey': base64(config.shared.sshPublicKey),
    httpProxy: base64(''),
    httpsProxy: base64(''),
    noProxy: base64(''),
    additionalTrustBundle: base64(''),
  };
}

function buildKubevirtSecretData(config: ClcConfig): CredentialSecretData {
  return {
    pullSecret: base64(config.shared.pullSecret),
    'ssh-publickey': base64(config.shared.sshPublicKey),
  };
}

function getProviderTypeLabel(provider: ClcProvider): string {
  const mapping: Record<ClcProvider, string> = {
    aws: 'aws',
    gcp: 'gcp',
    azure: 'azr',
    azgov: 'azr',
    vmware: 'vmw',
    openstack: 'ost',
    kubevirt: 'kubevirt',
  };
  return mapping[provider];
}

function buildSecretData(provider: ClcProvider, config: ClcConfig): CredentialSecretData {
  switch (provider) {
    case 'aws':
      return buildAwsSecretData(config);
    case 'gcp':
      return buildGcpSecretData(config);
    case 'azure':
      return buildAzureSecretData(config, 'azure');
    case 'azgov':
      return buildAzureSecretData(config, 'azgov');
    case 'vmware':
      return buildVmwareSecretData(config);
    case 'openstack':
      return buildOpenstackSecretData(config);
    case 'kubevirt':
      return buildKubevirtSecretData(config);
  }
}

function buildCredentialYaml(
  credential: ClusterCreateCredentialPayload,
  provider: ClcProvider,
  config: ClcConfig,
): string {
  const data = buildSecretData(provider, config);
  const dataEntries = Object.entries(data)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  return `apiVersion: v1
kind: Namespace
metadata:
  name: ${credential.namespace}
---
apiVersion: v1
kind: Secret
metadata:
  name: ${credential.name}
  namespace: ${credential.namespace}
  labels:
    ${ACM_CREDENTIAL_LABEL}: ""
    ${ACM_CREDENTIAL_TYPE}: ${getProviderTypeLabel(provider)}
type: Opaque
data:
${dataEntries}
`;
}

/**
 * Creates a provider credential Secret on the hub cluster via `oc apply`.
 */
export async function setupCredential(
  oc: OcCliService,
  provider: ClcProvider,
  credential: ClusterCreateCredentialPayload,
  config: ClcConfig,
): Promise<void> {
  const yaml = buildCredentialYaml(credential, provider, config);
  await oc.applyManifestFromStdin(yaml);
}

/**
 * Deletes a provider credential Secret (cleanup after test).
 */
export async function deleteCredential(
  oc: OcCliService,
  credential: ClusterCreateCredentialPayload,
): Promise<void> {
  await oc.run(
    `oc delete secret ${credential.name} -n ${credential.namespace} --ignore-not-found`,
  );
}
