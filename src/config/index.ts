/**
 * Configuration loader: `.env` (optional) + process environment.
 * Per architecture doc: prefer `getHubAuth()` / `getTestConfig()` over `process.env` in specs.
 * Password for auth.setup: HUB_PASSWORD only (same as oc login). Optional: CONSOLE_USERNAME, CONSOLE_IDP.
 */
import path from 'path';
import dotenv from 'dotenv';
import type { HubAuthConfig, TestConfig } from './schema';
import { hubAuthPresets } from './presets';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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

export function getTestConfig(): TestConfig {
  return {
    hub: getHubAuth(),
  };
}
