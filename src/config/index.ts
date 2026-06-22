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
import path from 'path';
import dotenv from 'dotenv';
import type { HubAuthConfig, RbacConfig, VirtConfig, TestConfig, RbacUser } from './schema';
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
  const password = process.env.RBAC_TEST_PASSWORD ?? '';
  const idp = process.env.RBAC_IDP ?? rbacPresets.defaultIdp;

  return rbacPresets.users
    .filter((u) => !domain || (u.domains as readonly string[]).includes(domain))
    .map((u) => ({
      role: u.role,
      username: u.username,
      password,
      idp: ('idp' in u ? (u as { idp: string }).idp : null) ?? idp,
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
    defaultIdp: process.env.RBAC_IDP || rbacPresets.defaultIdp,
    spokeCluster: process.env.RBAC_SPOKE_CLUSTER || process.env.VIRT_SPOKE_CLUSTER || '',
    users,
  };
}

export function getVirtConfig(): VirtConfig {
  return {
    spokeCluster: process.env.VIRT_SPOKE_CLUSTER ?? 'local-cluster',
  };
}

export type { HubAuthConfig, RbacConfig, VirtConfig, TestConfig } from './schema';

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
