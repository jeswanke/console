/**
 * Configuration loader: `.env` (optional) + process environment.
 * Per architecture doc: prefer `getHubAuth()` / `getTestConfig()` over `process.env` in specs.
 * Password for auth.setup: HUB_PASSWORD only (same as oc login). Optional: CONSOLE_USERNAME, CONSOLE_IDP.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { HubAuthConfig, TestConfig, RbacUser } from './schema';
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

/**
 * Hub console login credentials (used by auth.setup and fixtures).
 * @throws if password is missing
 */
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
  const idp = process.env.RBAC_IDP ?? rbacPresets.idp;

  return rbacPresets.users
    .filter((u) => !domain || (u.domains as readonly string[]).includes(domain))
    .map((u) => ({
      role: u.role,
      username: u.username,
      password,
      idp,
      domains: u.domains,
    }));
}

export function getTestConfig(): TestConfig {
  return {
    hub: getHubAuth(),
  };
}

export {
  clearE2eSpecDataCache,
  resolveArgoPushScenarioById,
  resolveScenarioById,
  resolveScenarioByTestId,
  resolveScenarioPair,
  resolveSubscriptionScenarioById,
  resolveSubscriptionScenarioByTestId,
  resolveSubscriptionScenarioPair,
  type ResolvedAppScenario,
  type ResolvedArgoPushAppScenario,
  type ResolvedSubscriptionAppScenario,
} from './e2e-spec-loader';
