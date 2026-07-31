/**
 * Configuration loader: .env (optional) + process environment.
 *
 * Per-area getters provide lazy validation -- RBAC vars are only checked
 * when running RBAC tests, virt vars only when running virt tests, etc.
 *
 * Usage:
 *   getHubAuth()      -- universal hub console login (auth.setup.ts)
 *   getTestConfig()   -- unified config for general tests
 *   getRbacConfig()   -- RBAC area config (rbac-test.ts fixture)
 *   getVirtConfig()   -- Fleet Virt area config (fleet-virt-test.ts fixture)
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
import type {
  HubAuthConfig,
  RbacConfig,
  VirtConfig,
  TestConfig,
  RbacUser,
  ClcConfig,
} from './schema';
export type { RbacUser } from './schema';
import { hubAuthPresets, rbacPresets } from './presets';

const repoRoot = process.cwd();

dotenv.config({ path: path.resolve(repoRoot, '.env') });

/** ALC-only secrets and integrations (`env/alc.local.env`). Does not override vars already set in the shell. */
export function loadAlcLocalEnvFile(): void {
  const alcLocal = path.resolve(repoRoot, 'env/alc.local.env');
  if (fs.existsSync(alcLocal)) {
    dotenv.config({ path: alcLocal, override: false });
  }
}

loadAlcLocalEnvFile();

/** CLC cloud provider secrets (`env/clc.local.env`). Does not override vars already set in the shell. */
export function loadClcLocalEnvFile(): void {
  const clcLocal = path.resolve(repoRoot, 'env/clc.local.env');
  if (fs.existsSync(clcLocal)) {
    dotenv.config({ path: clcLocal, override: false });
  }
}

loadClcLocalEnvFile();

export function getHubAuth(): HubAuthConfig {
  const hubPassword = process.env.HUB_PASSWORD;
  if (!hubPassword) {
    throw new Error(
      'HUB_PASSWORD is required (same value used for oc login and console UI login in auth.setup)'
    );
  }
  return {
    hubUser: process.env.CONSOLE_USERNAME ?? hubAuthPresets.hubUser,
    hubPassword,
    hubIdp: process.env.CONSOLE_IDP ?? hubAuthPresets.hubIdp,
  };
}

export function getRbacUsers(domain?: string): RbacUser[] {
  const defaultPassword = process.env.RBAC_TEST_PASSWORD ?? '';
  const defaultIdp = process.env.RBAC_IDP ?? rbacPresets.idp;

  return rbacPresets.users
    .filter((u) => !domain || (u.domains as readonly string[]).includes(domain))
    .map((u) => ({
      role: u.role,
      username: u.username,
      password: ('password' in u && u.password) ? u.password as string : defaultPassword,
      idp: ('idp' in u && u.idp) ? u.idp as string : defaultIdp,
      domains: u.domains,
    }));
}

export function getTestConfig(): TestConfig {
  return {
    hub: getHubAuth(),
  };
}

export function getRbacConfig(): RbacConfig {
  const users: Record<string, string> = {};
  for (const u of rbacPresets.users) {
    users[u.role.replace('fg-rbac-', '')] = u.username;
  }

  return {
    idpName: process.env.RBAC_IDP || rbacPresets.idp,
    spokeCluster: process.env.RBAC_SPOKE_CLUSTER || process.env.VIRT_SPOKE_CLUSTER || '',
    users,
  };
}

export function getVirtConfig(): VirtConfig {
  return {
    spokeCluster: process.env.VIRT_SPOKE_CLUSTER ?? 'local-cluster',
  };
}

/**
 * Resolve an env var that is either a file path or inline content.
 *
 * Heuristic: if the value starts with `/`, `./`, or `~` it's treated as a file path
 * and read from disk. Otherwise it's treated as inline content (e.g. a JSON string
 * or multi-line SSH key pasted directly into the env file).
 *
 * For multi-line values in .env files, use escaped newlines: `\n` in the string —
 * dotenv will parse them correctly when the value is double-quoted.
 */
function readFileOrInline(envVar: string | undefined): string {
  if (!envVar) return '';
  const trimmed = envVar.trim();
  if (!trimmed) return '';

  const looksLikePath = /^[~./]/.test(trimmed) || path.isAbsolute(trimmed);
  if (looksLikePath) {
    const resolved = trimmed.startsWith('~')
      ? path.join(os.homedir(), trimmed.slice(1))
      : trimmed;
    try {
      return fs.readFileSync(resolved, 'utf-8').trim();
    } catch {
      return '';
    }
  }

  return trimmed;
}

/** Extract pull secret from the hub cluster via oc (synchronous fallback). */
function getPullSecretFromHub(): string {
  try {
    const { execSync } = require('child_process');
    const result = execSync(
      'oc get secret/pull-secret -n openshift-config -o jsonpath="{.data.\\.dockerconfigjson}"',
      { encoding: 'utf-8', timeout: 30_000, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const b64 = result.trim().replace(/^"|"$/g, '');
    return Buffer.from(b64, 'base64').toString('utf-8').trim();
  } catch {
    return '';
  }
}

/**
 * CLC config — loaded lazily when cluster creation tests run.
 * Only the `shared` and `ocpRelease` fields are always required;
 * provider sub-objects are populated only when the relevant env vars are set.
 *
 * Pull secret: if CLC_PULL_SECRET is not set, auto-extracted from the hub cluster
 * (`oc get secret/pull-secret -n openshift-config`).
 */
export function getClcConfig(): ClcConfig {
  const pullSecret = readFileOrInline(process.env.CLC_PULL_SECRET) || getPullSecretFromHub();
  const sshPrivateKey = readFileOrInline(process.env.CLC_SSH_PRIVATE_KEY);
  const sshPublicKey = readFileOrInline(process.env.CLC_SSH_PUBLIC_KEY);

  const version = process.env.CLC_OCP_IMAGE_VERSION ?? '4.18';
  const arch = process.env.CLC_OCP_IMAGE_ARCH ?? 'multi';
  const registry =
    process.env.CLC_OCP_IMAGE_REGISTRY ?? 'quay.io/openshift-release-dev/ocp-release';

  const aws: ClcConfig['aws'] = process.env.CLC_AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.CLC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLC_AWS_SECRET_ACCESS_KEY ?? '',
        baseDomain: process.env.CLC_AWS_BASE_DOMAIN ?? '',
      }
    : undefined;

  const gcp: ClcConfig['gcp'] = process.env.CLC_GCP_PROJECT_ID
    ? {
        projectId: process.env.CLC_GCP_PROJECT_ID,
        serviceAccountJson: readFileOrInline(process.env.CLC_GCP_SERVICE_ACCOUNT_JSON),
        baseDomain: process.env.CLC_GCP_BASE_DOMAIN ?? '',
      }
    : undefined;

  const azure: ClcConfig['azure'] = process.env.CLC_AZURE_BASE_DOMAIN_RG
    ? {
        baseDomainResourceGroup: process.env.CLC_AZURE_BASE_DOMAIN_RG,
        clientId: process.env.CLC_AZURE_CLIENT_ID ?? '',
        clientSecret: process.env.CLC_AZURE_CLIENT_SECRET ?? '',
        tenantId: process.env.CLC_AZURE_TENANT_ID ?? '',
        subscriptionId: process.env.CLC_AZURE_SUBSCRIPTION_ID ?? '',
        baseDomain: process.env.CLC_AZURE_BASE_DOMAIN ?? '',
        cloudName: process.env.CLC_AZURE_CLOUD_NAME ?? 'AzurePublicCloud',
      }
    : undefined;

  const azgov: ClcConfig['azgov'] = process.env.CLC_AZGOV_BASE_DOMAIN_RG
    ? {
        baseDomainResourceGroup: process.env.CLC_AZGOV_BASE_DOMAIN_RG,
        clientId: process.env.CLC_AZGOV_CLIENT_ID ?? '',
        clientSecret: process.env.CLC_AZGOV_CLIENT_SECRET ?? '',
        tenantId: process.env.CLC_AZGOV_TENANT_ID ?? '',
        subscriptionId: process.env.CLC_AZGOV_SUBSCRIPTION_ID ?? '',
        baseDomain: process.env.CLC_AZGOV_BASE_DOMAIN ?? '',
        cloudName: process.env.CLC_AZGOV_CLOUD_NAME ?? 'AzureUSGovernmentCloud',
      }
    : undefined;

  const vmware: ClcConfig['vmware'] = process.env.CLC_VMWARE_VCENTER
    ? {
        vCenter: process.env.CLC_VMWARE_VCENTER,
        username: process.env.CLC_VMWARE_USERNAME ?? '',
        password: process.env.CLC_VMWARE_PASSWORD ?? '',
        caCertificate: readFileOrInline(process.env.CLC_VMWARE_CACERTIFICATE),
        cluster: process.env.CLC_VMWARE_CLUSTER ?? '',
        datacenter: process.env.CLC_VMWARE_DATACENTER ?? '',
        datastore: process.env.CLC_VMWARE_DATASTORE ?? '',
        baseDomain: process.env.CLC_VMWARE_BASE_DOMAIN ?? '',
      }
    : undefined;

  const openstack: ClcConfig['openstack'] = process.env.CLC_OPENSTACK_CLOUDS_YAML
    ? {
        cloudsYaml: readFileOrInline(process.env.CLC_OPENSTACK_CLOUDS_YAML),
        cloudName: process.env.CLC_OPENSTACK_CLOUD_NAME ?? 'openstack',
        baseDomain: process.env.CLC_OPENSTACK_BASE_DOMAIN ?? '',
        clusterOsImage: process.env.CLC_OPENSTACK_CLUSTER_OS_IMAGE ?? '',
      }
    : undefined;

  const kubevirt: ClcConfig['kubevirt'] = process.env.CLC_KUBEVIRT_NAMESPACE
    ? { namespace: process.env.CLC_KUBEVIRT_NAMESPACE }
    : undefined;

  return {
    shared: { pullSecret, sshPrivateKey, sshPublicKey },
    ocpRelease: {
      version,
      arch,
      registry,
      releaseImage: `${registry}:${version}-${arch}`,
    },
    aws,
    gcp,
    azure,
    azgov,
    vmware,
    openstack,
    kubevirt,
  };
}

export type { HubAuthConfig, RbacConfig, VirtConfig, TestConfig, ClcConfig } from './schema';
export type { ClcProvider } from './schema';

export {
  resolveClusterCreateScenarioById,
  resolveClusterCreateScenarioByTestId,
  resolveEnabledClusterCreateScenarios,
  type ClusterCreateCredentialPayload,
  type ClusterCreateParamsPayload,
  type ResolvedClusterCreateScenario,
} from './e2e-spec-loader';

export {
  clearE2eSpecDataCache,
  resolveArgoPushScenarioById,
  resolveArgoPushScenarioByTestId,
  resolvePlacementScenarioById,
  resolvePlacementScenarioByTestId,
  resolvePolicyScenarioById,
  resolvePolicyScenarioByTestId,
  resolvePolicySetScenarioById,
  resolvePolicySetScenarioByTestId,
  resolveScenarioById,
  resolveScenarioByTestId,
  resolveScenarioPair,
  resolveSubscriptionScenarioById,
  resolveSubscriptionScenarioByTestId,
  resolveSubscriptionScenarioPair,
  type PlacementPreviewSetupPayload,
  type ResolvedAppScenario,
  type ResolvedArgoPushAppScenario,
  type ResolvedPlacementScenario,
  type ResolvedPolicyScenario,
  type ResolvedPolicySetScenario,
  type ResolvedSubscriptionAppScenario,
} from './e2e-spec-loader';
