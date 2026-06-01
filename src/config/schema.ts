/**
 * Configuration types — hub auth and runtime options.
 * Values are loaded in `index.ts` / `getHubAuth()` from CONSOLE_* env (not read ad hoc in tests).
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

export interface TestConfig {
  readonly hub: HubAuthConfig;
}
